/**
 * End-to-end private R2 upload: browser -> signed multipart chunks -> completion
 * -> DB attachment -> authorized playback redirect.
 *
 * Requires the mock R2 server and app configured as documented in the script.
 */
import assert from "node:assert/strict";
import { open, unlink } from "node:fs/promises";

import { chromium, type Page } from "playwright-core";

import { prisma } from "../lib/db";
import { getMediaPlayback } from "../lib/media-url";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43123";
const title = `Private R2 check ${Date.now()}`;
// Above the old 100 MB app/Cloudinary ceiling: this only succeeds if the bytes
// travel directly to R2 in chunks and never enter the Server Action body.
const bytes = 112 * 1024 * 1024;
const testFile = "/tmp/vid/r2-original-112mb.mp4";
const shareToken = `r2-share-${Date.now()}`;
let drillId: string | null = null;
let planId: string | null = null;
let shareId: string | null = null;

async function login(page: Page, email: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function cleanup() {
  if (shareId) {
    await prisma.parentShareLink.delete({ where: { id: shareId } }).catch(() => {});
  }
  if (planId) {
    await prisma.trainingPlan.delete({ where: { id: planId } }).catch(() => {});
  }
  if (drillId) {
    await prisma.catalogDrill.delete({ where: { id: drillId } }).catch(() => {});
  }
  const video = await prisma.trainingVideo.findFirst({
    where: { title },
    select: { id: true, videoUrl: true },
  });
  if (video) await prisma.trainingVideo.delete({ where: { id: video.id } });
  if (video?.videoUrl.startsWith("/api/media/videos/")) {
    const id = video.videoUrl.split("/").pop();
    if (id) await prisma.mediaUpload.delete({ where: { id } }).catch(() => {});
  }
}

async function main() {
  const handle = await open(testFile, "w");
  await handle.truncate(bytes);
  await handle.close();
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const ownerContext = await browser.newContext();
    const owner = await ownerContext.newPage();
    await login(owner, "admin@example.com");
    await owner.goto(`${BASE}/videos/new`, { waitUntil: "networkidle" });
    await owner.click('button:has-text("Original quality")');
    await owner.locator('input[name="file"]').setInputFiles(testFile);
    await owner
      .locator("text=/Uploaded securely · ready to save/i")
      .waitFor({ timeout: 60_000 });
    await owner.fill('input[name="title"]', title);
    await owner.click('button:has-text("Upload video")');
    await owner.waitForURL(
      (url) =>
        /\/videos\/[^/]+$/.test(url.pathname) && url.pathname !== "/videos/new",
      { timeout: 60_000 },
    );

    const video = await prisma.trainingVideo.findFirst({
      where: { title },
      select: { videoUrl: true, storageKey: true },
    });
    assert.ok(video, "the video record should be created");
    assert.ok(video.videoUrl.startsWith("/api/media/videos/"));
    assert.deepEqual(getMediaPlayback(video.videoUrl), {
      kind: "file",
      src: video.videoUrl,
    });
    assert.ok(video.storageKey?.startsWith("private-videos/"));
    const mediaId = video.videoUrl.split("/").pop()!;
    const media = await prisma.mediaUpload.findUnique({ where: { id: mediaId } });
    assert.equal(media?.status, "READY");
    assert.equal(Number(media?.sizeBytes), bytes);
    assert.equal(media?.multipartId, null);

    const anonymous = await fetch(`${BASE}${video.videoUrl}`, {
      redirect: "manual",
    });
    assert.equal(anonymous.status, 404, "anonymous playback must be hidden");

    const ownerResponse = await owner.request.get(`${BASE}${video.videoUrl}`, {
      maxRedirects: 0,
    });
    assert.equal(ownerResponse.status(), 307, "owner should receive a signed R2 URL");
    assert.match(ownerResponse.headers().location ?? "", /127\.0\.0\.1:4569/);

    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await login(other, "coach@example.com");
    const denied = await other.request.get(`${BASE}${video.videoUrl}`, {
      maxRedirects: 0,
    });
    assert.equal(denied.status(), 404, "unrelated coach must not see private film");

    const director = await prisma.user.findUniqueOrThrow({
      where: { email: "director@example.com" },
      select: { id: true },
    });
    const drill = await prisma.catalogDrill.create({
      data: {
        sport: "Baseball",
        ageBand: "8-10",
        title: `Shared ${title}`,
        focus: "Throwing",
        durationMin: 10,
        equipment: "Ball",
        howTo: "Throw with a partner.",
        coachingCue: "Finish through the target.",
        videoUrl: video.videoUrl,
        videoStorageKey: video.storageKey,
        shareWithCoaches: true,
        shareWithAthletes: false,
        updatedById: director.id,
      },
    });
    drillId = drill.id;
    const sharedCoach = await other.request.get(`${BASE}${video.videoUrl}`, {
      maxRedirects: 0,
    });
    assert.equal(
      sharedCoach.status(),
      307,
      "a coach may play a catalog drill shared with coaches",
    );
    await prisma.catalogDrill.update({
      where: { id: drill.id },
      data: { shareWithCoaches: false },
    });
    const hiddenCoach = await other.request.get(`${BASE}${video.videoUrl}`, {
      maxRedirects: 0,
    });
    assert.equal(hiddenCoach.status(), 404, "turning sharing off must revoke access");

    const athlete = await prisma.athlete.findFirstOrThrow({
      select: { id: true },
    });
    const plan = await prisma.trainingPlan.create({
      data: {
        coachId: director.id,
        athleteId: athlete.id,
        title: `Private playback ${Date.now()}`,
        workouts: {
          create: {
            title: "Shared workout",
            instructionVideoUrl: video.videoUrl,
            instructionVideoStorageKey: video.storageKey,
          },
        },
      },
    });
    planId = plan.id;
    const share = await prisma.parentShareLink.create({
      data: { athleteId: athlete.id, token: shareToken },
    });
    shareId = share.id;
    const family = await fetch(
      `${BASE}${video.videoUrl}?shareToken=${encodeURIComponent(shareToken)}`,
      { redirect: "manual" },
    );
    assert.equal(family.status, 307, "a valid family share token may play its workout");
    const wrongFamily = await fetch(`${BASE}${video.videoUrl}?shareToken=wrong`, {
      redirect: "manual",
    });
    assert.equal(wrongFamily.status, 404, "the wrong share token must be denied");

    await otherContext.close();
    await ownerContext.close();

    console.log(
      `private R2 checks passed (${bytes / 1024 / 1024} MB, 12 signed chunks with retry, private playback)`,
    );
  } finally {
    await browser.close();
    await cleanup();
    await unlink(testFile).catch(() => {});
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
