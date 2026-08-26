/**
 * Drives the whole voice-over loop in a real browser with a fake microphone:
 * coach records over the video, previews, saves, then the athlete plays the
 * saved review back through the authorized streaming route.
 *
 * Usage: REVIEW_ID=<videoReviewId> npx tsx scripts/test-voice-review-browser.ts
 */
import { chromium, type Browser, type Page } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43123";
const REVIEW_ID = process.env.REVIEW_ID;

if (!REVIEW_ID) {
  console.error("Set REVIEW_ID to a VideoReview id.");
  process.exit(1);
}

async function login(page: Page, email: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function coachRecords(browser: Browser) {
  const context = await browser.newContext({
    permissions: ["microphone"],
    viewport: { width: 900, height: 1000 },
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") console.log(`  browser error: ${message.text()}`);
  });

  await login(page, "coach@example.com");
  await page.goto(`${BASE}/videos/reviews/${REVIEW_ID}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1500);

  await page.getByRole("button", { name: /record voice review|record again/i }).click();
  await page.waitForTimeout(1200);

  const recording = await page
    .getByText(/RECORDING/)
    .isVisible()
    .catch(() => false);
  if (!recording) {
    const message = await page
      .locator("section")
      .first()
      .innerText()
      .catch(() => "");
    throw new Error(`Recording never started. Panel said:\n${message}`);
  }
  console.log("  recording started");

  // Talk over the clip: play it, let it run, then pause mid-review.
  await page.evaluate(`(() => {
    var video = document.querySelector('video');
    if (video) video.play();
  })()`);
  await page.waitForTimeout(2500);
  await page.evaluate(`(() => {
    var video = document.querySelector('video');
    if (video) video.pause();
  })()`);
  await page.waitForTimeout(1200);

  await page.getByRole("button", { name: /finish review/i }).click();
  await page.waitForTimeout(1500);

  const previewVisible = await page
    .getByText(/Preview review/i)
    .isVisible()
    .catch(() => false);
  if (!previewVisible) throw new Error("Preview did not appear after finishing.");
  console.log("  preview rendered");

  await page.getByRole("button", { name: /^save review$/i }).click();
  await page.waitForTimeout(6000);

  const savedVisible = await page
    .getByText(/Voice review saved/i)
    .first()
    .isVisible()
    .catch(() => false);
  if (!savedVisible) {
    const panel = await page.locator("section").first().innerText();
    throw new Error(`Save did not confirm. Panel said:\n${panel}`);
  }
  console.log("  saved to the server");

  const streamStatus = await page.evaluate(
    `fetch('/api/video-reviews/${REVIEW_ID}/voice').then(r => r.status + ' ' + (r.headers.get('content-type') || ''))`,
  );
  console.log(`  coach stream: ${streamStatus}`);
  if (!String(streamStatus).startsWith("200")) {
    throw new Error("Coach could not stream the saved audio.");
  }

  const sendButton = page.getByRole("button", {
    name: /save & send review|complete review/i,
  });
  if (await sendButton.isVisible().catch(() => false)) {
    await sendButton.click();
    await page.waitForTimeout(3000);
    console.log("  review sent to the athlete");
  } else {
    console.log("  review was already sent");
  }

  await context.close();
}

async function athletePlaysBack(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  await login(page, process.env.ATHLETE_EMAIL ?? "athlete@example.com");
  await page.goto(`${BASE}/athlete/videos/reviews/${REVIEW_ID}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1500);

  const status = await page.evaluate(
    `fetch('/api/video-reviews/${REVIEW_ID}/voice').then(r => r.status)`,
  );
  console.log(`  athlete stream status: ${status}`);

  const playButton = page
    .getByRole("button", { name: /play review/i })
    .first();
  if (!(await playButton.isVisible().catch(() => false))) {
    const body = await page.locator("main").innerText();
    throw new Error(`Athlete has no Play review control. Page said:\n${body}`);
  }

  await playButton.click();
  await page.waitForTimeout(2500);

  const progress = (await page.evaluate(`(() => {
    var audio = document.querySelector('audio');
    var video = document.querySelector('video');
    return {
      audioTime: audio ? audio.currentTime : null,
      audioPaused: audio ? audio.paused : null,
      videoTime: video ? video.currentTime : null
    };
  })()`)) as {
    audioTime: number | null;
    audioPaused: boolean | null;
    videoTime: number | null;
  };

  console.log(
    `  audio at ${progress.audioTime}s (paused=${progress.audioPaused}), video at ${progress.videoTime}s`,
  );
  if (!progress.audioTime || progress.audioTime < 0.4) {
    throw new Error("Coach audio did not advance for the athlete.");
  }

  await context.close();
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });

  console.log("Coach records a voice review:");
  await coachRecords(browser);
  console.log("Athlete plays it back:");
  await athletePlaysBack(browser);

  await browser.close();
  console.log("\nSynchronized voice review loop works end to end.");
}

main().catch((error) => {
  console.error(`\nFAILED: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
