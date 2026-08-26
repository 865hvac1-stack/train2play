/**
 * Proves a Platform Admin can move between the command center and the lower
 * portals by clicking, and that a Director never sees the Platform Admin link.
 *
 * Usage: npx tsx scripts/test-admin-portal-switch.ts
 */
import { chromium, type Browser, type Page } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43123";
const PASSWORD = process.env.DEMO_PASSWORD ?? "password123";
const ADMIN_EMAIL = process.env.LOCAL_ADMIN_EMAIL ?? "admin@example.com";
const DIRECTOR_EMAIL = process.env.LOCAL_DIRECTOR_EMAIL ?? "director@example.com";

async function loginAs(browser: Browser, email: string, width = 1440) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle").catch(() => {});
  return { context, page };
}

async function clickNav(page: Page, name: RegExp) {
  const link = page.getByRole("link", { name }).first();
  if ((await link.count()) === 0) return false;
  await link.click();
  await page.waitForTimeout(1200);
  return true;
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const problems: string[] = [];

  const admin = await loginAs(browser, ADMIN_EMAIL);
  if (!admin.page.url().includes("/admin")) {
    problems.push(`admin landed on ${admin.page.url()} instead of /admin`);
  }

  if (!(await clickNav(admin.page, /^Director portal$/))) {
    problems.push("command center has no Director portal link");
  } else if (!admin.page.url().includes("/trainer")) {
    problems.push(`Director portal link went to ${admin.page.url()}`);
  } else {
    const directorBody = await admin.page.locator("body").innerText();
    if (!/Program health|Suggested drills/i.test(directorBody)) {
      problems.push("Director portal did not render its own navigation");
    }
    if (!(await clickNav(admin.page, /^Platform Admin$/))) {
      problems.push("Director portal has no way back to Platform Admin");
    } else if (!admin.page.url().endsWith("/admin")) {
      problems.push(`Platform Admin link went to ${admin.page.url()}`);
    }
  }

  await admin.page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await admin.page.waitForTimeout(700);
  if (!(await clickNav(admin.page, /^Coach portal$/))) {
    problems.push("command center has no Coach portal link");
  } else if (!admin.page.url().includes("/dashboard")) {
    problems.push(`Coach portal link went to ${admin.page.url()}`);
  }
  await admin.context.close();

  // A Director must not be offered the Platform Admin command center.
  const director = await loginAs(browser, DIRECTOR_EMAIL);
  await director.page.goto(`${BASE}/trainer`, { waitUntil: "domcontentloaded" });
  await director.page.waitForTimeout(900);
  const directorNav = await director.page
    .locator('a[href="/admin"]')
    .count();
  if (directorNav > 0) {
    problems.push("director portal exposes a Platform Admin link");
  }
  await director.context.close();

  await browser.close();

  if (problems.length > 0) {
    console.error("Portal switch problems:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log("admin portal switch checks passed");
}

main().catch((error) => {
  console.error(`FAILED: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
