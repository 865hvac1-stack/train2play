import { NextResponse } from "next/server";

import { getAppUrl, getProductionWarnings } from "@/lib/env";
import { prisma } from "@/lib/db";
import { isObjectStorageConfigured } from "@/lib/storage";

export async function GET() {
  let databaseOk = false;

  if (process.env.DATABASE_URL) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseOk = true;
    } catch {
      databaseOk = false;
    }
  }

  const checks = {
    database: databaseOk,
    auth: Boolean(process.env.AUTH_SECRET),
    appUrl: Boolean(process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL),
    objectStorage: isObjectStorageConfigured(),
    email: Boolean(process.env.RESEND_API_KEY),
  };

  const ok = checks.database && checks.auth && checks.appUrl;

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      service: "train2play",
      url: getAppUrl(),
      checks,
      warnings: getProductionWarnings(),
    },
    { status: ok ? 200 : 503 },
  );
}
