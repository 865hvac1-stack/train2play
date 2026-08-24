const PRODUCTION_REQUIRED = ["DATABASE_URL", "AUTH_SECRET"] as const;

export function getAppUrl() {
  const url =
    process.env.AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:43123";

  return url.replace(/\/$/, "");
}

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

export function showDemoCredentials() {
  return !isProductionRuntime() || process.env.SEED_DEMO === "true";
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
}

export function getProductionWarnings() {
  const warnings: string[] = [];

  if (!process.env.RESEND_API_KEY) {
    warnings.push("RESEND_API_KEY is not set — pickup and parent emails are disabled.");
  }

  if (
    !process.env.S3_BUCKET ||
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY
  ) {
    warnings.push(
      "Video object storage is not configured — uploads will not survive redeploys.",
    );
  }

  return warnings;
}
