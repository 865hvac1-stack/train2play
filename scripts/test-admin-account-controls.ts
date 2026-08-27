/**
 * Exercises the Account controls on /admin/users/[id] as a signed-in Platform
 * Admin and asserts that every outcome — including refused changes — renders an
 * inline message instead of blowing the page into the error boundary.
 *
 * Usage: npx tsx scripts/test-admin-account-controls.ts
 */
import { chromium, type Page } from "playwright-core";

import { prisma } from "../lib/db";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43123";
const PASSWORD = "password123";
const ADMIN_EMAIL = "admin@example.com";
const DIRECTOR_EMAIL = "director@example.com";

const problems: string[] = [];

async function login(page: Page, email: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function attempt(
  page: Page,
  userId: string,
  role: string,
  label: string,
  expect: { message: RegExp; dbRole: string },
) {
  await page.goto(`${BASE}/admin/users/${userId}`, {
    waitUntil: "networkidle",
  });
  const form = page.locator('form:has(select[name="role"])');
  await form.locator('button:has-text("Update role")').waitFor();
  await page.selectOption('select[name="role"]', role);
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

  const body = await page.locator("body").innerText();
  const crashed = /Something went wrong|Application error|digest/i.test(body);
  const dbRole = (
    await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
  )?.role;

  console.log(`\n=== ${label} -> ${role} ===`);
  console.log(`crashed: ${crashed}`);
  console.log(`message: ${message.replace(/\s+/g, " ").trim() || "(none)"}`);
  console.log(`db role: ${dbRole}`);

  if (crashed) problems.push(`${label}: page crashed instead of inline message`);
  if (!expect.message.test(message)) {
    problems.push(`${label}: message did not match ${expect.message}`);
  }
  if (dbRole !== expect.dbRole) {
    problems.push(`${label}: db role is ${dbRole}, expected ${expect.dbRole}`);
  }
}

async function main() {
  const admin = await prisma.user.findFirst({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });
  const director = await prisma.user.findFirst({
    where: { email: DIRECTOR_EMAIL },
    select: { id: true },
  });
  if (!admin || !director) throw new Error("Seed the local accounts first.");
  await prisma.user.update({
    where: { id: director.id },
    data: { role: "TRAINER" },
  });

  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, ADMIN_EMAIL);

  await attempt(page, admin.id, "PLATFORM_ADMIN", "own account, same role", {
    message: /already Platform Admin/i,
    dbRole: "PLATFORM_ADMIN",
  });
  await attempt(page, admin.id, "COACH", "own account, demote self", {
    message: /cannot change your own role/i,
    dbRole: "PLATFORM_ADMIN",
  });
  await attempt(page, director.id, "COACH", "director to coach", {
    message: /is now Coach/i,
    dbRole: "COACH",
  });
  await attempt(page, director.id, "TRAINER", "coach back to director", {
    message: /is now Director/i,
    dbRole: "TRAINER",
  });
  await attempt(page, director.id, "PLATFORM_ADMIN", "director to admin", {
    message: /is now Platform Admin/i,
    dbRole: "PLATFORM_ADMIN",
  });

  // With a second admin present, self-demotion is still refused by design.
  await attempt(page, admin.id, "TRAINER", "self-demote with backup admin", {
    message: /cannot change your own role/i,
    dbRole: "PLATFORM_ADMIN",
  });

  await attempt(page, director.id, "TRAINER", "admin back to director", {
    message: /is now Director/i,
    dbRole: "TRAINER",
  });

  // Deactivation refusals must also stay inline.
  await page.goto(`${BASE}/admin/users/${admin.id}`, {
    waitUntil: "networkidle",
  });
  const deactivateForm = page.locator(
    'form:has(button:has-text("Deactivate account"))',
  );
  await deactivateForm.waitFor();
  await page.click('button:has-text("Deactivate account")');
  let deactivateMessage = "";
  for (let tick = 0; tick < 40; tick += 1) {
    deactivateMessage = await deactivateForm
      .locator('[role="alert"]')
      .first()
      .innerText()
      .catch(() => "");
    if (deactivateMessage.trim()) break;
    await page.waitForTimeout(250);
  }
  console.log(`\n=== own account, deactivate ===`);
  console.log(`message: ${deactivateMessage.replace(/\s+/g, " ").trim()}`);
  if (!/cannot deactivate your own account/i.test(deactivateMessage)) {
    problems.push("self-deactivate: no inline refusal message");
  }

  await browser.close();
  await prisma.$disconnect();

  if (problems.length) {
    console.error(`\n${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log("\nAll Account controls outcomes render inline. No crashes.");
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
