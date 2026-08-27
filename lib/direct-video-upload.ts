export type DirectUploadProgress = {
  uploadedBytes: number;
  totalBytes: number;
  percent: number;
  part: number;
  partCount: number;
};

export type DirectUploadResult = {
  mediaId: string;
  videoUrl: string;
  storageKey: string;
};

type StartedUpload = {
  mediaId: string;
  partBytes: number;
  parts: Array<{ partNumber: number; url: string }>;
};

const MAX_ATTEMPTS = 4;
const CONCURRENCY = 3;

async function responseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error ?? fallback;
}

async function start(file: File): Promise<StartedUpload | null> {
  const response = await fetch("/api/media/uploads/video", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "video/mp4",
      sizeBytes: file.size,
    }),
  });
  if (response.status === 409) return null;
  if (!response.ok) throw new Error(await responseError(response, "Could not start upload"));
  return response.json() as Promise<StartedUpload>;
}

function putPart(
  url: string,
  body: Blob,
  onProgress: (loaded: number) => void,
  signal?: AbortSignal,
) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    });
    xhr.addEventListener("load", () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`R2 rejected video chunk (${xhr.status})`));
        return;
      }
      // R2 CORS must expose ETag so multipart completion can name every part.
      const etag = xhr.getResponseHeader("etag");
      if (!etag) {
        reject(
          new Error(
            "R2 did not expose ETag. Add ETag to the bucket CORS response headers.",
          ),
        );
        return;
      }
      resolve(etag);
    });
    xhr.addEventListener("error", () =>
      reject(new Error("The video connection was interrupted")),
    );
    xhr.addEventListener("abort", () =>
      reject(new DOMException("Aborted", "AbortError")),
    );
    const abort = () => xhr.abort();
    signal?.addEventListener("abort", abort, { once: true });
    xhr.addEventListener("loadend", () =>
      signal?.removeEventListener("abort", abort),
    );
    xhr.send(body);
  });
}

async function withRetries<T>(operation: () => Promise<T>, signal?: AbortSignal) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
      }
    }
  }
  throw lastError;
}

export async function uploadVideoDirectly(
  file: File,
  options: {
    onProgress?: (progress: DirectUploadProgress) => void;
    signal?: AbortSignal;
  } = {},
): Promise<DirectUploadResult | null> {
  const session = await start(file);
  if (!session) return null;

  const completed = new Map<number, string>();
  const inFlight = new Map<number, number>();
  let cursor = 0;
  const report = (partNumber: number) => {
    const completedBytes = session.parts.reduce((sum, part) => {
      if (!completed.has(part.partNumber)) return sum;
      const startByte = (part.partNumber - 1) * session.partBytes;
      return sum + Math.min(session.partBytes, file.size - startByte);
    }, 0);
    const uploadedBytes = Math.min(
      file.size,
      completedBytes + [...inFlight.values()].reduce((sum, bytes) => sum + bytes, 0),
    );
    options.onProgress?.({
      uploadedBytes,
      totalBytes: file.size,
      percent: Math.min(99, Math.round((uploadedBytes / file.size) * 100)),
      part: partNumber,
      partCount: session.parts.length,
    });
  };

  const worker = async () => {
    while (cursor < session.parts.length) {
      const part = session.parts[cursor];
      cursor += 1;
      const startByte = (part.partNumber - 1) * session.partBytes;
      const body = file.slice(startByte, startByte + session.partBytes);
      const etag = await withRetries(
        () =>
          putPart(
            part.url,
            body,
            (loaded) => {
              inFlight.set(part.partNumber, loaded);
              report(part.partNumber);
            },
            options.signal,
          ),
        options.signal,
      );
      inFlight.delete(part.partNumber);
      completed.set(part.partNumber, etag);
      report(part.partNumber);
    }
  };

  try {
    await Promise.all(
      Array.from(
        { length: Math.min(CONCURRENCY, session.parts.length) },
        () => worker(),
      ),
    );
    const completionBody = JSON.stringify({
      parts: [...completed].map(([partNumber, etag]) => ({
        partNumber,
        etag,
      })),
    });
    const response = await withRetries(
      async () => {
        const result = await fetch(
          `/api/media/uploads/video/${session.mediaId}/complete`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: completionBody,
            signal: options.signal,
          },
        );
        if (!result.ok) {
          throw new Error(await responseError(result, "Could not finish upload"));
        }
        return result;
      },
      options.signal,
    );
    options.onProgress?.({
      uploadedBytes: file.size,
      totalBytes: file.size,
      percent: 100,
      part: session.parts.length,
      partCount: session.parts.length,
    });
    return response.json() as Promise<DirectUploadResult>;
  } catch (error) {
    await fetch(`/api/media/uploads/video/${session.mediaId}`, {
      method: "DELETE",
    }).catch(() => {});
    throw error;
  }
}
