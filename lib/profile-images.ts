import { isProductionRuntime } from "@/lib/env";
import { isObjectStorageConfigured, storeImageFile } from "@/lib/storage";

export const MAX_PROFILE_IMAGE_BYTES = 8 * 1024 * 1024;

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);

export function firstUploadedFile(formData: FormData, name: string) {
  for (const entry of formData.getAll(name)) {
    if (entry instanceof File && entry.size > 0) return entry;
  }
  return null;
}

function looksLikeImage(file: File) {
  if (file.type.startsWith("image/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(ext);
}

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && IMAGE_EXTENSIONS.has(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type.includes("heic") || file.type.includes("heif")) return "heic";
  return "jpg";
}

export async function storeProfileImageFromForm(
  formData: FormData,
  fieldName: string,
): Promise<{ url: string } | { error: string } | null> {
  const file = firstUploadedFile(formData, fieldName);
  if (!file) return null;
  if (!looksLikeImage(file)) {
    return { error: "Choose a photo from your camera or library (JPG, PNG, HEIC, or WebP)." };
  }
  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    return { error: "Photos must be 8 MB or smaller." };
  }
  if (isProductionRuntime() && !isObjectStorageConfigured()) {
    return { error: "Photo uploads need Cloudinary or R2." };
  }
  try {
    const stored = await storeImageFile(
      Buffer.from(await file.arrayBuffer()),
      `${crypto.randomUUID()}.${extensionFor(file)}`,
      file.type && file.type.startsWith("image/") ? file.type : "image/jpeg",
    );
    return { url: stored.imageUrl };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not upload photo.",
    };
  }
}
