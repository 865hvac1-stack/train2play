import { NextResponse } from "next/server";

import { isObjectStorageConfigured } from "@/lib/storage";

export async function GET() {
  const checks = {
    database: Boolean(process.env.DATABASE_URL),
    auth: Boolean(process.env.AUTH_SECRET),
    objectStorage: isObjectStorageConfigured(),
    email: Boolean(process.env.RESEND_API_KEY),
  };

  const ok = checks.database && checks.auth;

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      service: "train2play",
      checks,
    },
    { status: ok ? 200 : 503 },
  );
}
