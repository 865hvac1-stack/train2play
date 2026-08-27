/**
 * Confirms the Railway allowlist warning renders on /admin/users/[id] when the
 * account's email is pinned by PLATFORM_ADMIN_EMAIL or TRAINER_EMAILS, so a
 * role saved in the UI is never silently reverted at the next sign-in.
 *
 * Run against a server started with those variables set:
 *   TRAINER_EMAILS=director@example.com PLATFORM_ADMIN_EMAIL=admin@example.com \
 *     npx next dev -p 43123
 *   npx tsx scripts/check-allowlist-note.ts
 */
import { chromium } from "playwright-core";

import { prisma } from "../lib/db";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43123";
const PASSWORD = "password123";

async function main() {
  const [admin, director] = await Promise.all([
    prisma.user.findFirst({
      where: { email: "admin@example.com" },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: { email: "director@example.com" },
      select: { id: true },
    }),
  ]);
  if (!admin || !director) throw new Error("Seed the local accounts first.");

  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', "admin@example.com");
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle").catch(() => {});

  const problems: string[] = [];

  await page.goto(`${BASE}/admin/users/${director.id}`, {
    waitUntil: "networkidle",
  });
  const directorNote = await page.locator("body").innerText();
  if (!/listed in TRAINER_EMAILS on Railway/.test(directorNote)) {
    problems.push("director page is missing the TRAINER_EMAILS warning");
  }
  if (!/set back to Director every time it signs in/.test(directorNote)) {
    problems.push("director warning does not name the enforced role");
  }

  await page.goto(`${BASE}/admin/users/${admin.id}`, {
    waitUntil: "networkidle",
  });
  const adminNote = await page.locator("body").innerText();
  if (!/listed in PLATFORM_ADMIN_EMAIL on Railway/.test(adminNote)) {
    problems.push("admin page is missing the PLATFORM_ADMIN_EMAIL warning");
  }

  // Saving a role the allowlist will overwrite must say so in the result.
  const form = page.locator('form:has(select[name="role"])');
  await page.goto(`${BASE}/admin/users/${director.id}`, {
    waitUntil: "networkidle",
  });
  await form.locator('button:has-text("Update role")').waitFor();
  await page.selectOption('select[name="role"]', "COACH");
  await page.click('button:has-text("Update role")');
  let message = "";
  for (let tick = 0; tick < 40; tick += 1) {
    message = await form
      .locator('[role="alert"], [role="status"]')
      .first()
      .innerText()
      .catch(() => "");
    if (message.trim()) break;
    await page.waitForTimeout(250);
  }
  console.log(`save result: ${message.replace(/\s+/g, " ").trim()}`);
  if (!/returns to Director at its next sign-in/.test(message)) {
    problems.push("saving an overridden role did not warn about the revert");
  }

  await prisma.user.update({
    where: { id: director.id },
    data: { role: "TRAINER" },
  });
  await browser.close();
  await prisma.$disconnect();

  if (problems.length) {
    console.error(`\n${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log("allowlist warnings render correctly");
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
