import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  GetObjectCommand,
  HeadObjectCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getS3Client, getS3Config } from "@/lib/storage";

export const R2_PART_BYTES = 10 * 1024 * 1024;
export const MAX_DIRECT_VIDEO_BYTES = 10 * 1024 * 1024 * 1024;
const UPLOAD_URL_TTL_SECONDS = 60 * 60;
const PLAYBACK_URL_TTL_SECONDS = 15 * 60;

function requiredConfig() {
  const config = getS3Config();
  if (!config?.endpoint) {
    throw new Error("Private R2 video storage is not configured");
  }
  return config;
}

function safeExtension(filename: string, contentType: string) {
  const raw = filename.split(".").pop()?.toLowerCase();
  if (raw && /^(mp4|mov|m4v|webm|mpeg|mpg|avi)$/.test(raw)) return raw;
  if (contentType.includes("quicktime")) return "mov";
  if (contentType.includes("webm")) return "webm";
  return "mp4";
}

export function privateVideoPath(mediaId: string) {
  return `/api/media/videos/${mediaId}`;
}

export async function beginR2VideoUpload(options: {
  ownerUserId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}) {
  const config = requiredConfig();
  const client = getS3Client(config);
  const extension = safeExtension(options.filename, options.contentType);
  const storageKey = `private-videos/${options.ownerUserId}/${crypto.randomUUID()}.${extension}`;
  const created = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: config.bucket,
      Key: storageKey,
      ContentType: options.contentType,
      Metadata: { owner: options.ownerUserId },
    }),
  );
  if (!created.UploadId) throw new Error("R2 did not create an upload");
  return { storageKey, multipartId: created.UploadId };
}

export async function signR2UploadParts(options: {
  storageKey: string;
  multipartId: string;
  sizeBytes: number;
}) {
  const config = requiredConfig();
  const client = getS3Client(config);
  const count = Math.ceil(options.sizeBytes / R2_PART_BYTES);
  if (count < 1 || count > 10_000) throw new Error("Invalid upload part count");

  return Promise.all(
    Array.from({ length: count }, async (_, index) => {
      const partNumber = index + 1;
      const url = await getSignedUrl(
        client,
        new UploadPartCommand({
          Bucket: config.bucket,
          Key: options.storageKey,
          UploadId: options.multipartId,
          PartNumber: partNumber,
        }),
        { expiresIn: UPLOAD_URL_TTL_SECONDS },
      );
      return { partNumber, url };
    }),
  );
}

export async function completeR2VideoUpload(options: {
  storageKey: string;
  multipartId: string;
  parts: Array<{ partNumber: number; etag: string }>;
}) {
  const config = requiredConfig();
  const client = getS3Client(config);
  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: config.bucket,
      Key: options.storageKey,
      UploadId: options.multipartId,
      MultipartUpload: {
        Parts: [...options.parts]
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((part) => ({
            PartNumber: part.partNumber,
            ETag: part.etag,
          })),
      },
    }),
  );
  return client.send(
    new HeadObjectCommand({
      Bucket: config.bucket,
      Key: options.storageKey,
    }),
  );
}

export async function abortR2VideoUpload(options: {
  storageKey: string;
  multipartId: string;
}) {
  const config = requiredConfig();
  await getS3Client(config).send(
    new AbortMultipartUploadCommand({
      Bucket: config.bucket,
      Key: options.storageKey,
      UploadId: options.multipartId,
    }),
  );
}

export async function getPrivateVideoPlaybackUrl(options: {
  storageKey: string;
  contentType: string;
}) {
  const config = requiredConfig();
  return getSignedUrl(
    getS3Client(config),
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: options.storageKey,
      ResponseContentType: options.contentType,
      ResponseContentDisposition: "inline",
    }),
    { expiresIn: PLAYBACK_URL_TTL_SECONDS },
  );
}
