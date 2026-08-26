/**
 * Coach hand-off loop in a real browser: a coach sends a director's suggested
 * drill to one of their players, the player sees who sent it, and the drill's
 * delivery report credits the coach.
 *
 * Usage: npx tsx scripts/test-coach-drill-handoff-browser.ts
 */
import { chromium, type Browser, type Page } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43123";
const COACH_EMAIL = process.env.DEMO_COACH_EMAIL ?? "coach@example.com";
const ATHLETE_EMAIL = process.env.DEMO_ATHLETE_EMAIL ?? "athlete@example.com";
const DIRECTOR_EMAIL = process.env.LOCAL_DIRECTOR_EMAIL ?? "director@example.com";
const PASSWORD = process.env.DEMO_PASSWORD ?? "password123";

async function loginAs(browser: Browser, email: string) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle").catch(() => {});
  return { context, page };
}

/** Roster player who can receive a send, preferring the one with a login. */
async function findSendablePlayer(page: Page, preferredFirstName?: string) {
  await page.goto(`${BASE}/athletes`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const hrefs = [
    ...new Set(
      (
        await page
          .locator('a[href^="/athletes/"]')
          .evaluateAll((nodes) =>
            nodes.map((node) => node.getAttribute("href") ?? ""),
          )
      ).filter((href) => /^\/athletes\/[a-z0-9]+$/i.test(href)),
    ),
  ];
  let fallback: string | null = null;
  for (const href of hrefs) {
    await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);
    const button = page
      .getByRole("button", { name: /^Send to \w+( again)?$/ })
      .first();
    if ((await button.count()) === 0) continue;
    const label = await button.innerText();
    if (
      preferredFirstName &&
      label.toLowerCase().includes(preferredFirstName.toLowerCase())
    ) {
      return href;
    }
    fallback ??= href;
  }
  return fallback;
}

/** The signed-in player's first name, as shown on their home screen. */
async function readAthleteFirstName(page: Page) {
  await page.goto(`${BASE}/athlete`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const text = await page.locator("body").innerText();
  const match = text.match(/Hey,\s*([A-Za-z'-]+)/);
  return match?.[1]?.toLowerCase();
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome-stable",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const problems: string[] = [];

  const player = await loginAs(browser, ATHLETE_EMAIL);
  const playerFirstName = await readAthleteFirstName(player.page);
  await player.context.close();

  const coach = await loginAs(browser, COACH_EMAIL);
  const athletePath = await findSendablePlayer(coach.page, playerFirstName);
  if (!athletePath) {
    console.error(
      "FAILED: no roster player offers a suggested-drill send button",
    );
    process.exit(1);
  }

  const sendButton = coach.page
    .getByRole("button", { name: /^Send to \w+( again)?$/ })
    .first();
  if ((await sendButton.count()) === 0) {
    problems.push("coach cannot send a suggested drill to this player");
  } else {
    const drillTitle = await sendButton
      .locator(
        "xpath=ancestor::div[contains(@class,'rounded-xl')][1]//p[contains(@class,'font-semibold')]",
      )
      .first()
      .innerText()
      .catch(() => "");
    await sendButton.click();
    await coach.page.waitForTimeout(1500);
    const afterSend = await coach.page.locator("body").innerText();
    if (!/Sent \w+ \d+/.test(afterSend)) {
      problems.push("coach page does not confirm the hand-off");
    }

    const athlete = await loginAs(browser, ATHLETE_EMAIL);
    await athlete.page.goto(`${BASE}/athlete`, {
      waitUntil: "domcontentloaded",
    });
    await athlete.page.waitForTimeout(1200);
    const athleteText = await athlete.page.locator("body").innerText();
    if (!/Sent by /i.test(athleteText)) {
      problems.push("player does not see who sent the drill");
    }
    if (drillTitle && !athleteText.includes(drillTitle)) {
      problems.push(`player is missing the sent drill: ${drillTitle}`);
    }
    await athlete.context.close();

    const director = await loginAs(browser, DIRECTOR_EMAIL);
    await director.page.goto(`${BASE}/trainer/drills?sport=Baseball`, {
      waitUntil: "domcontentloaded",
    });
    await director.page.waitForTimeout(800);
    const reportLink = director.page
      .locator('a[href^="/trainer/drills/"]')
      .first();
    if ((await reportLink.count()) === 0) {
      problems.push(
        `director drills page has no delivery report link (page said: ${(
          await director.page.locator("body").innerText()
        )
          .slice(0, 200)
          .replace(/\s+/g, " ")})`,
      );
    } else {
      await reportLink.click();
      await director.page.waitForTimeout(1500);
      const reportText = await director.page.locator("body").innerText();
      if (!reportText.includes("Coaches")) {
        problems.push("delivery report is missing the coaches table");
      }
      if (!/sent it/i.test(reportText)) {
        problems.push("delivery report does not credit any sender");
      }
    }
    await director.context.close();
  }

  await coach.context.close();
  await browser.close();

  if (problems.length > 0) {
    console.error("Coach hand-off problems:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log("coach hand-off browser checks passed");
}

main().catch((error) => {
  console.error(`FAILED: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
