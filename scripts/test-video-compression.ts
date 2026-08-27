/**
 * Proves a phone-sized drill clip is compressed in the browser before upload.
 *
 * Camera film runs ~10 Mbps, so a 45-second clip is ~53 MB and longer drills
 * would exceed every upload limit. This drives the real /videos/new form with a
 * generated 45-second 10 Mbps file and checks what actually landed in storage:
 * far smaller, same duration, still playable.
 *
 * Requires ffmpeg and a dev server. Usage:
 *   npx tsx scripts/test-video-compression.ts
 */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { chromium } from "playwright-core";

import { prisma } from "../lib/db";

const run = promisify(execFile);

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:43123";
const SOURCE = "/tmp/vid/drill-45s.mp4";
const SOURCE_SECONDS = 45;
const title = `Compression check ${Date.now()}`;

async function ensureSourceVideo() {
  await mkdir(path.dirname(SOURCE), { recursive: true });
  try {
    const existing = await stat(SOURCE);
    if (existing.size > 40 * 1024 * 1024) return existing.size;
  } catch {
    // fall through and generate
  }
  await run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    `testsrc2=size=1920x1080:rate=30:duration=${SOURCE_SECONDS}`,
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=440:duration=${SOURCE_SECONDS}`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-b:v",
    "9800k",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-shortest",
    SOURCE,
  ]);
  return (await stat(SOURCE)).size;
}

async function probeDuration(file: string) {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=nw=1:nk=1",
    file,
  ]);
  return Number.parseFloat(stdout.trim());
}

async function cleanup(storageKey: string | null) {
  const leftover = await prisma.trainingVideo.findFirst({
    where: { title },
    select: { id: true, storageKey: true, videoUrl: true },
  });
  if (leftover) await prisma.trainingVideo.delete({ where: { id: leftover.id } });
  if (leftover?.videoUrl.startsWith("/api/media/videos/")) {
    const mediaId = leftover.videoUrl.split("/").pop();
    if (mediaId) {
      await prisma.mediaUpload.delete({ where: { id: mediaId } }).catch(() => {});
    }
    return;
  }
  const key = storageKey ?? leftover?.storageKey ?? null;
  if (key) {
    await unlink(path.join(process.cwd(), "public", "uploads", key)).catch(
      () => {},
    );
  }
}

async function main() {
  const sourceBytes = await ensureSourceVideo();
  console.log(`source clip: ${(sourceBytes / 1024 / 1024).toFixed(1)} MB`);

  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
  const page = await browser.newPage();
  let storageKey: string | null = null;

  try {
    page.on("pageerror", (error) => console.log("PAGEERROR:", error.message));

    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.fill('input[name="email"]', "admin@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin(?:\?|$)/, { timeout: 20_000 });

    await page.goto(`${BASE_URL}/videos/new`, { waitUntil: "networkidle" });
    await page.locator('input[name="file"]').setInputFiles(SOURCE);

    // Compression plays the clip through, so allow longer than its duration.
    const status = page
      .locator("text=/ready to upload|Uploaded securely · ready to save/i")
      .first();
    await status.waitFor({ timeout: 180_000 });
    const statusText = (await status.innerText()).replace(/\s+/g, " ").trim();
    console.log(`form reported: ${statusText}`);
    assert.match(
      statusText,
      /Compressed .* → .*(ready to upload|Uploaded securely)/i,
      "the form should report the before and after size",
    );

    await page.fill('input[name="title"]', title);
    await page.click('button:has-text("Upload video")');
    await page.waitForURL(
      (url) =>
        /\/videos\/[^/]+$/.test(url.pathname) && url.pathname !== "/videos/new",
      { timeout: 120_000 },
    );

    const created = await prisma.trainingVideo.findFirst({
      where: { title },
      select: { storageKey: true, videoUrl: true },
    });
    assert.ok(created?.storageKey, "the upload should be stored");
    storageKey = created.storageKey;

    let storedPath = path.join(process.cwd(), "public", "uploads", storageKey);
    if (created.videoUrl.startsWith("/api/media/videos/")) {
      const response = await page.request.get(`${BASE_URL}${created.videoUrl}`);
      assert.ok(response.ok(), "authorized playback should reach private R2");
      storedPath = "/tmp/vid/compressed-from-r2.mp4";
      await writeFile(storedPath, await response.body());
    }
    const stored = await stat(storedPath);
    const duration = await probeDuration(storedPath);

    console.log(
      `stored: ${(stored.size / 1024 / 1024).toFixed(1)} MB, ${duration.toFixed(1)}s`,
    );

    assert.ok(
      stored.size < sourceBytes / 3,
      `stored file should be far smaller than ${(sourceBytes / 1024 / 1024).toFixed(1)} MB, got ${(stored.size / 1024 / 1024).toFixed(1)} MB`,
    );
    assert.ok(
      Math.abs(duration - SOURCE_SECONDS) < 3,
      `stored clip should still be ~${SOURCE_SECONDS}s, got ${duration.toFixed(1)}s`,
    );

    // A three-minute drill is the case that used to be impossible.
    const perSecond = stored.size / duration;
    const threeMinutes = (perSecond * 180) / 1024 / 1024;
    console.log(
      `projected 3-minute drill: ${threeMinutes.toFixed(1)} MB (was ~${((sourceBytes / SOURCE_SECONDS) * 180 / 1024 / 1024).toFixed(0)} MB)`,
    );
    assert.ok(
      threeMinutes < 100,
      "a three-minute drill must fit under the 100 MB limit",
    );

    console.log("video compression checks passed");
  } finally {
    await browser.close();
    await cleanup(storageKey);
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
