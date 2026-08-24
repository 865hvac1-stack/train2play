import { mkdir, writeFile } from "fs/promises";
import path from "path";

import {
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { v2 as cloudinary } from "cloudinary";

export type StoredVideo = {
  videoUrl: string;
  storageKey: string;
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
