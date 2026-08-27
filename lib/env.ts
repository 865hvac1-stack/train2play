const PRODUCTION_REQUIRED = ["DATABASE_URL", "AUTH_SECRET"] as const;

export function getAppUrl() {
  let url =
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : null) ??
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:43123";

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  return url.replace(/\/$/, "");
}

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

/** Demo credentials only on local/dev — never on a public marketing page in production. */
export function showDemoCredentials() {
  return !isProductionRuntime();
}

export function validateProductionEnv() {
  if (!isProductionRuntime()) {
    return;
  }

  const missing = PRODUCTION_REQUIRED.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Train2Play cannot start — missing required env: ${missing.join(", ")}`,
    );
  }

  if (!process.env.AUTH_URL && !process.env.NEXT_PUBLIC_APP_URL) {
    throw new Error(
      "Train2Play cannot start — set AUTH_URL (and NEXT_PUBLIC_APP_URL) to your public site URL.",
    );
  }

  if (process.env.RESEND_API_KEY && !process.env.EMAIL_FROM?.trim()) {
    throw new Error(
      "RESEND_API_KEY is set but EMAIL_FROM is missing. Use a verified sender like Train2Play <noreply@train2play.com>.",
    );
  }

  if (process.env.SEED_DEMO === "true") {
    console.warn(
      "[train2play] SEED_DEMO=true in production — demo accounts may be created. Use only on staging.",
    );
  }
}

export function getProductionWarnings() {
  const warnings: string[] = [];

  if (!process.env.RESEND_API_KEY) {
    warnings.push(
      "RESEND_API_KEY is not set — pickup alerts, parent invites, and password reset emails are disabled.",
    );
  }

  if (
    !process.env.CLOUDINARY_URL &&
    !(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) &&
    !(
      process.env.S3_BUCKET &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
    )
  ) {
    warnings.push(
      "Video storage is not configured — add CLOUDINARY_URL (easiest) so phone uploads work in production.",
    );
  }
  if (
    !(
      process.env.S3_BUCKET &&
      process.env.S3_ENDPOINT &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
    )
  ) {
    warnings.push(
      "Private direct video uploads are not configured — add the Cloudflare R2 S3 variables for long, resumable uploads.",
    );
  }

  return warnings;
}
