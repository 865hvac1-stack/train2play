/**
 * Proves a normal phone-sized video above Next proxy's old 10 MB default can
 * pass through the authenticated /videos Server Action.
 *
 * Usage: npx tsx scripts/test-video-upload-limits.ts
 */
import assert from "node:assert/strict";
import { unlink } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright-core";

import { prisma } from "../lib/db";
import {
  MAX_VIDEO_UPLOAD_BYTES,
  videoFileSizeError,
} from "../lib/video-upload-limits";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:43123";
const TEST_BYTES = 12 * 1024 * 1024;
const title = `12 MB upload check ${Date.now()}`;

async function main() {
  assert.equal(videoFileSizeError(new File(["ok"], "ok.mp4")), null);
  assert.match(
    videoFileSizeError({
      name: "too-large.mp4",
      size: MAX_VIDEO_UPLOAD_BYTES + 1,
    } as File) ?? "",
    /over the 100 MB limit/,
  );

  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin(?:\?|$)/, { timeout: 15_000 });

    await page.goto(`${BASE_URL}/videos/new`, { waitUntil: "networkidle" });
    await page.locator('input[name="file"]').setInputFiles({
      name: "phone-video.mp4",
      mimeType: "video/mp4",
      buffer: Buffer.alloc(TEST_BYTES),
    });
    await page.fill('input[name="title"]', title);
    await page.click('button:has-text("Upload video")');
    await page.waitForURL(
      (url) =>
        /\/videos\/[^/]+$/.test(url.pathname) &&
        url.pathname !== "/videos/new",
      { timeout: 60_000 },
    );

    const created = await prisma.trainingVideo.findFirst({
      where: { title },
      select: { id: true, storageKey: true },
    });
    assert.ok(created, "12 MB upload should create a TrainingVideo");
    assert.ok(created.storageKey, "uploaded video should retain its storage key");

    await prisma.trainingVideo.delete({ where: { id: created.id } });
    await unlink(
      path.join(process.cwd(), "public", "uploads", created.storageKey),
    ).catch(() => {});
    console.log(
      `video upload limit check passed (${TEST_BYTES / 1024 / 1024} MB through proxy)`,
    );
  } finally {
    await browser.close();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const leftover = await prisma.trainingVideo.findFirst({
      where: { title },
      select: { id: true, storageKey: true },
    });
    if (leftover) {
      await prisma.trainingVideo.delete({ where: { id: leftover.id } });
      if (leftover.storageKey) {
        await unlink(
          path.join(process.cwd(), "public", "uploads", leftover.storageKey),
        ).catch(() => {});
      }
    }
    await prisma.$disconnect();
  });
