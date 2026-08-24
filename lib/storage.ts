import { mkdir, writeFile } from "fs/promises";
import path from "path";

import {
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";

export type StoredVideo = {
  videoUrl: string;
  storageKey: string;
};

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
  return getS3Config() !== null;
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

export async function storeVideoFile(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<StoredVideo> {
  const storageKey = `videos/${filename}`;
  const s3Config = getS3Config();

  if (s3Config) {
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

  const uploadDir = path.join(process.cwd(), "public", "uploads", "videos");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);

  return {
    storageKey,
    videoUrl: `/uploads/videos/${filename}`,
  };
}
