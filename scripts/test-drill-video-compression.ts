/**
 * Covers the Director drill form: a phone-sized clip is compressed before it is
 * saved, and saving mid-compression is refused rather than uploading the
 * original file. Usage: npx tsx scripts/test-drill-video-compression.ts
 */
import assert from "node:assert/strict";
import { stat, unlink } from "node:fs/promises";
import path from "node:path";

import { chromium, type Page } from "playwright-core";

import { prisma } from "../lib/db";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:43123";
const SOURCE = "/tmp/vid/drill-45s.mp4";
const title = `Compression drill ${Date.now()}`;

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', "director@example.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/trainer(?:\?|$)/, { timeout: 20_000 });
}

async function fillDrill(page: Page) {
  await page.selectOption('select[name="sport"]', "Baseball");
  await page.selectOption('select[name="ageBand"]', { index: 1 });
  await page.fill('input[name="title"]', title);
  await page.fill('input[name="focus"]', "Barrel path");
  await page.fill('input[name="equipment"]', "Tee, bat");
  await page.fill('textarea[name="howTo"]', "Ten swings from the tee.");
  await page.fill('input[name="coachingCue"]', "Stay through the ball.");
}

async function cleanup() {
  const drill = await prisma.catalogDrill.findFirst({
    where: { title },
    select: { id: true, videoStorageKey: true, videoUrl: true },
  });
  if (!drill) return;
  await prisma.catalogDrill.delete({ where: { id: drill.id } });
  if (drill.videoUrl?.startsWith("/api/media/videos/")) {
    const mediaId = drill.videoUrl.split("/").pop();
    if (mediaId) {
      await prisma.mediaUpload.delete({ where: { id: mediaId } }).catch(() => {});
    }
    return;
  }
  if (drill.videoStorageKey) {
    await unlink(
      path.join(process.cwd(), "public", "uploads", drill.videoStorageKey),
    ).catch(() => {});
  }
}

async function main() {
  const sourceBytes = (await stat(SOURCE)).size;
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
  const page = await browser.newPage();

  try {
    await login(page);
    await page.goto(`${BASE_URL}/trainer/drills`, { waitUntil: "networkidle" });

    await page.click('button:has-text("Upload file")');
    await fillDrill(page);
    await page
      .locator('input[name="instructionVideoFile"]')
      .setInputFiles(SOURCE);

    // Saving while the browser is still compressing must be refused.
    await page.locator("text=/Compressing/i").first().waitFor({ timeout: 30_000 });
    await page.click('button:has-text("Add drill")');
    const pending = page.locator("text=/still compressing on your device/i");
    await pending.first().waitFor({ timeout: 20_000 });
    console.log("mid-compression save refused with a readable message");
    assert.equal(
      await prisma.catalogDrill.count({ where: { title } }),
      0,
      "no drill should be created while compression is pending",
    );

    // Now let it finish and save for real.
    await page
      .locator("text=/ready to upload|Uploaded securely · ready to save/i")
      .first()
      .waitFor({ timeout: 180_000 });
    await page.click('button:has-text("Add drill")');
    await page.waitForURL(/\/trainer\/drills\/[^/]+/, { timeout: 120_000 });

    const drill = await prisma.catalogDrill.findFirst({
      where: { title },
      select: { videoUrl: true, videoStorageKey: true },
    });
    assert.ok(drill?.videoStorageKey, "the drill should have a stored video");

    const storedBytes = drill.videoUrl?.startsWith("/api/media/videos/")
      ? Number(
          (
            await prisma.mediaUpload.findUnique({
              where: { id: drill.videoUrl.split("/").pop()! },
              select: { sizeBytes: true },
            })
          )?.sizeBytes ?? 0,
        )
      : (
          await stat(
            path.join(process.cwd(), "public", "uploads", drill.videoStorageKey),
          )
        ).size;
    console.log(
      `drill video stored: ${(storedBytes / 1024 / 1024).toFixed(1)} MB (source ${(sourceBytes / 1024 / 1024).toFixed(1)} MB)`,
    );
    assert.ok(
      storedBytes < sourceBytes / 3,
      "the drill video should be compressed before upload",
    );

    console.log("drill video compression checks passed");
  } finally {
    await browser.close();
    await cleanup();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
