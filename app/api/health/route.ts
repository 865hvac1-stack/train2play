import { NextResponse } from "next/server";

import { getAppUrl, getProductionWarnings } from "@/lib/env";
import { prisma } from "@/lib/db";
import {
  isDirectVideoUploadConfigured,
  isObjectStorageConfigured,
} from "@/lib/storage";

/** Newest applied migration, so a deploy's schema state is checkable by URL. */
async function readLatestMigration() {
  try {
    const rows = await prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL
      ORDER BY finished_at DESC
      LIMIT 1
    `;
    return rows[0]?.migration_name ?? null;
  } catch {
    return null;
  }
}

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

  const commitSha =
    process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? null;

  const checks = {
    database: databaseOk,
    auth: Boolean(process.env.AUTH_SECRET),
    appUrl: Boolean(process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL),
    objectStorage: isObjectStorageConfigured(),
    directPrivateVideo: isDirectVideoUploadConfigured(),
    email: Boolean(process.env.RESEND_API_KEY),
  };

  const ok = checks.database && checks.auth && checks.appUrl;

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      service: "train2play",
      url: getAppUrl(),
      version: {
        commit: commitSha ? commitSha.slice(0, 8) : null,
        branch: process.env.RAILWAY_GIT_BRANCH ?? null,
        deployedAt: process.env.RAILWAY_DEPLOYMENT_CREATED_AT ?? null,
        latestMigration: databaseOk ? await readLatestMigration() : null,
      },
      checks,
      warnings: getProductionWarnings(),
    },
    { status: ok ? 200 : 503 },
  );
}
