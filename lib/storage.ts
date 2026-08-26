import { createReadStream } from "fs";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import { Readable } from "stream";
import path from "path";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";

export type StoredVideo = {
  videoUrl: string;
  storageKey: string;
};

export type StoredPrivateAudio = {
  storageKey: string;
  provider: "cloudinary" | "s3" | "local";
};

function getCloudinaryConfig() {
  const url = process.env.CLOUDINARY_URL?.trim();
  if (url) {
    return { mode: "url" as const, url };
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (cloudName && apiKey && apiSecret) {
    return { mode: "keys" as const, cloudName, apiKey, apiSecret };
  }

  return null;
}

function configureCloudinary() {
  const config = getCloudinaryConfig();
  if (!config) return null;

  if (config.mode === "url") {
    // cloudinary SDK reads CLOUDINARY_URL automatically when present
    cloudinary.config(true);
  } else {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    });
  }

  return cloudinary;
}

function getS3Config() {
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    bucket,
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT,
    publicUrlBase: process.env.S3_PUBLIC_URL?.replace(/\/$/, ""),
    accessKeyId,
    secretAccessKey,
  };
}

export function isObjectStorageConfigured() {
  return getCloudinaryConfig() !== null || getS3Config() !== null;
}

export function getVideoStorageProvider(): "cloudinary" | "s3" | "local" {
  if (getCloudinaryConfig()) return "cloudinary";
  if (getS3Config()) return "s3";
  return "local";
}

function getS3Client(config: NonNullable<ReturnType<typeof getS3Config>>) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: Boolean(config.endpoint),
  });
}

function buildPublicUrl(
  config: NonNullable<ReturnType<typeof getS3Config>>,
  key: string,
) {
  if (config.publicUrlBase) {
    return `${config.publicUrlBase}/${key}`;
  }

  if (config.endpoint) {
    return `${config.endpoint.replace(/\/$/, "")}/${config.bucket}/${key}`;
  }

  return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;
}

async function storeVideoInCloudinary(
  buffer: Buffer,
  filename: string,
): Promise<StoredVideo> {
  const client = configureCloudinary();
  if (!client) {
    throw new Error("Cloudinary is not configured");
  }

  const publicId = `train2play/videos/${filename.replace(/\.[^.]+$/, "")}`;

  const result = await new Promise<{ public_id: string; secure_url: string }>(
    (resolve, reject) => {
      const stream = client.uploader.upload_stream(
        {
          resource_type: "video",
          public_id: publicId,
          overwrite: false,
        },
        (error, uploaded) => {
          if (error || !uploaded) {
            reject(error ?? new Error("Cloudinary upload failed"));
            return;
          }
          resolve({
            public_id: uploaded.public_id,
            secure_url: uploaded.secure_url,
          });
        },
      );
      stream.end(buffer);
    },
  );

  return {
    storageKey: result.public_id,
    videoUrl: result.secure_url,
  };
}

async function storeVideoInS3(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<StoredVideo> {
  const s3Config = getS3Config();
  if (!s3Config) {
    throw new Error("S3/R2 is not configured");
  }

  const storageKey = `videos/${filename}`;
  const client = getS3Client(s3Config);
  const input: PutObjectCommandInput = {
    Bucket: s3Config.bucket,
    Key: storageKey,
    Body: buffer,
    ContentType: contentType,
  };

  await client.send(new PutObjectCommand(input));

  return {
    storageKey,
    videoUrl: buildPublicUrl(s3Config, storageKey),
  };
}

export async function storeVideoFile(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<StoredVideo> {
  if (getCloudinaryConfig()) {
    return storeVideoInCloudinary(buffer, filename);
  }

  if (getS3Config()) {
    return storeVideoInS3(buffer, filename, contentType);
  }

  const storageKey = `videos/${filename}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "videos");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);

  return {
    storageKey,
    videoUrl: `/uploads/videos/${filename}`,
  };
}

/** Store coach commentary privately; clients only receive our authorized API URL. */
export async function storePrivateAudioFile(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<StoredPrivateAudio> {
  const cloudinaryClient = configureCloudinary();
  if (cloudinaryClient) {
    const publicId = `train2play/voice-reviews/${filename.replace(/\.[^.]+$/, "")}`;
    await new Promise<void>((resolve, reject) => {
      const stream = cloudinaryClient.uploader.upload_stream(
        {
          resource_type: "video",
          type: "authenticated",
          public_id: publicId,
          overwrite: false,
        },
        (error, uploaded) => {
          if (error || !uploaded) {
            reject(error ?? new Error("Private audio upload failed"));
            return;
          }
          resolve();
        },
      );
      stream.end(buffer);
    });
    return { storageKey: publicId, provider: "cloudinary" };
  }

  const s3Config = getS3Config();
  if (s3Config) {
    const storageKey = `voice-reviews/${filename}`;
    await getS3Client(s3Config).send(
      new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: contentType,
        // Intentionally no public-read ACL.
      }),
    );
    return { storageKey, provider: "s3" };
  }

  const storageKey = `voice-reviews/${filename}`;
  const privateDir = path.join(process.cwd(), ".private-media", "voice-reviews");
  await mkdir(privateDir, { recursive: true });
  await writeFile(path.join(privateDir, filename), buffer);
  return { storageKey, provider: "local" };
}

function parseByteRange(range: string | null, size: number) {
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    return null;
  }
  return { start, end: Math.min(end, size - 1) };
}

/**
 * Stream private audio after the caller authorizes the requesting user.
 * Supports byte ranges so mobile browsers do not repeatedly download the file.
 */
export async function getPrivateAudioResponse(options: {
  provider: string;
  storageKey: string;
  contentType: string;
  range: string | null;
}): Promise<Response> {
  if (options.provider === "cloudinary") {
    const client = configureCloudinary();
    if (!client) throw new Error("Cloudinary is not configured");
    const signedUrl = client.url(options.storageKey, {
      resource_type: "video",
      type: "authenticated",
      secure: true,
      sign_url: true,
    });
    const upstream = await fetch(signedUrl, {
      headers: options.range ? { Range: options.range } : undefined,
    });
    const headers = new Headers();
    headers.set(
      "Content-Type",
      upstream.headers.get("content-type") ?? options.contentType,
    );
    headers.set("Accept-Ranges", "bytes");
    for (const name of ["content-length", "content-range"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set("Cache-Control", "private, no-store");
    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  }

  if (options.provider === "s3") {
    const config = getS3Config();
    if (!config) throw new Error("S3 is not configured");
    const result = await getS3Client(config).send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: options.storageKey,
        Range: options.range ?? undefined,
      }),
    );
    const body = result.Body?.transformToWebStream();
    const headers = new Headers({
      "Content-Type": result.ContentType ?? options.contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
    });
    if (result.ContentLength != null) {
      headers.set("Content-Length", String(result.ContentLength));
    }
    if (result.ContentRange) headers.set("Content-Range", result.ContentRange);
    return new Response(body, {
      status: options.range ? 206 : 200,
      headers,
    });
  }

  const filename = path.basename(options.storageKey);
  const filePath = path.join(
    process.cwd(),
    ".private-media",
    "voice-reviews",
    filename,
  );
  const fileStat = await stat(filePath);
  const parsed = parseByteRange(options.range, fileStat.size);
  const start = parsed?.start ?? 0;
  const end = parsed?.end ?? fileStat.size - 1;
  const nodeStream = createReadStream(filePath, { start, end });
  const headers = new Headers({
    "Content-Type": options.contentType,
    "Content-Length": String(end - start + 1),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
  });
  if (parsed) {
    headers.set("Content-Range", `bytes ${start}-${end}/${fileStat.size}`);
  }
  return new Response(Readable.toWeb(nodeStream) as ReadableStream, {
    status: parsed ? 206 : 200,
    headers,
  });
}

export async function deletePrivateAudioFile(options: {
  provider: string;
  storageKey: string;
}) {
  if (options.provider === "cloudinary") {
    const client = configureCloudinary();
    if (!client) return;
    await client.uploader.destroy(options.storageKey, {
      resource_type: "video",
      type: "authenticated",
      invalidate: true,
    });
    return;
  }
  if (options.provider === "s3") {
    const config = getS3Config();
    if (!config) return;
    await getS3Client(config).send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: options.storageKey,
      }),
    );
    return;
  }
  const filename = path.basename(options.storageKey);
  await unlink(
    path.join(process.cwd(), ".private-media", "voice-reviews", filename),
  ).catch(() => undefined);
}
