/**
 * A refused save must not wipe the form.
 *
 * React resets an uncontrolled `<form action={…}>` once the action returns, so a
 * single validation error used to clear the whole drill — title, focus, cue, and
 * the chosen video — forcing the coach to retype everything and re-pick a file
 * that can take a minute to compress. These forms submit through a transition
 * instead; this guards that.
 *
 * Usage: npx tsx scripts/test-form-preserves-on-error.ts
 */
import assert from "node:assert/strict";

import { chromium, type Page } from "playwright-core";

import { prisma } from "../lib/db";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:43123";
const title = `Preserved drill ${Date.now()}`;

const READ_FORM = `(() => {
  const el = document.querySelector('input[name="instructionVideoFile"]');
  const form = el ? el.closest('form') : null;
  const val = (sel) => {
    const node = form ? form.querySelector(sel) : null;
    return node ? node.value : null;
  };
  return JSON.stringify({
    title: val('input[name="title"]'),
    focus: val('input[name="focus"]'),
    equipment: val('input[name="equipment"]'),
    cue: val('input[name="coachingCue"]'),
    sport: val('select[name="sport"]'),
    fileName: el && el.files && el.files[0] ? el.files[0].name : null,
  });
})()`;

async function readForm(page: Page) {
  return JSON.parse((await page.evaluate(READ_FORM)) as string) as Record<
    string,
    string | null
  >;
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.fill('input[name="email"]', "director@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/trainer/, { timeout: 20_000 });

    await page.goto(`${BASE_URL}/trainer/drills`, { waitUntil: "networkidle" });
    await page.click('button:has-text("Upload file")');
    await page.selectOption('select[name="sport"]', "Baseball");
    await page.selectOption('select[name="ageBand"]', { index: 1 });
    await page.fill('input[name="title"]', title);
    await page.fill('input[name="focus"]', "Barrel path");
    await page.fill('input[name="equipment"]', "Tee, bat");
    await page.fill('textarea[name="howTo"]', "Ten swings from the tee.");
    await page.fill('input[name="coachingCue"]', "Stay through the ball.");

    // A non-video file is refused by the server without any upload work.
    await page.locator('input[name="instructionVideoFile"]').setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not a video"),
    });

    const before = await readForm(page);
    await page.click('button:has-text("Add drill")');
    await page
      .locator("text=/must be a video/i")
      .first()
      .waitFor({ timeout: 20_000 });
    const after = await readForm(page);

    assert.equal(
      await prisma.catalogDrill.count({ where: { title } }),
      0,
      "the refused drill must not be created",
    );

    for (const field of ["title", "focus", "equipment", "cue", "sport"]) {
      assert.equal(
        after[field],
        before[field],
        `${field} should survive a refused save`,
      );
    }
    assert.equal(
      after.fileName,
      before.fileName,
      "the chosen video should survive a refused save",
    );

    console.log(
      `form preserved after refusal: title="${after.title}" file=${after.fileName}`,
    );
    console.log("form preservation checks passed");
  } finally {
    await browser.close();
    await prisma.catalogDrill.deleteMany({ where: { title } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
