// Takes the PRD screenshots (01-05), the drawers (06-07), the (+) picker (08), What changed
// tiles (09), Today in New project (10), the Rico mascot (12) and its drag (13) into ./screenshots. Needs the dev server: npm run dev
// Usage: node scripts/screenshots.mjs [url]
import { chromium } from "playwright";

const TARGET = process.argv[2] ?? "http://localhost:5173/";
const OUT = new URL("../screenshots/", import.meta.url).pathname;
const errors = [];

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));

async function load() {
  await page.goto(TARGET, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
}
const shot = (name, opts = {}) => page.screenshot({ path: OUT + name, ...opts });

// 1. Today
await load();
await page.getByRole("tab", { name: "Today" }).click();
await shot("01-today.png", { fullPage: true });

// 2. Proposed, Normal
await page.getByRole("tab", { name: "Proposed" }).click();
await page.waitForTimeout(300); // let the tab highlight finish its transition
await shot("02-proposed-normal.png", { fullPage: true });

// 3. One card with the (i) popover open: Active subscriptions, with incl./excl. lines
const card = page.locator("[data-slot=card]", { hasText: "Active subscriptions" }).first();
await card.getByRole("button", { name: "What is Active subscriptions?" }).click();
const popover = page.locator("[data-slot=popover-content]");
await popover.waitFor();
const a = await card.boundingBox(), b = await popover.boundingBox();
const x = Math.min(a.x, b.x) - 16, y = Math.min(a.y, b.y) - 16;
await shot("03-card-detail.png", {
  clip: { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x + 16, height: Math.max(a.y + a.height, b.y + b.height) - y + 16 },
});
await page.keyboard.press("Escape");

// 4. What changed tiles + chart modal with "as of" carried over
const strip = page.getByRole("region", { name: "What changed" });
await strip.scrollIntoViewIfNeeded();
await page.mouse.wheel(0, -260);
await strip.getByRole("article", { name: /^MRR:/ }).getByRole("button", { name: /Open chart/ }).click();
await page.getByRole("dialog").waitFor();
await page.waitForTimeout(250);
await shot("04-what-changed-and-modal.png");
await page.keyboard.press("Escape");

const check = (ok, what) => { if (!ok) errors.push(`check failed: ${what}`); };
const cardCount = () => page.getByRole("region", { name: "Key numbers" }).locator("[data-slot=card]").count();
check((await cardCount()) === 4, "4 default cards");

// 8. (+) picker open over the card row; then add two, (+) disables, remove one.
await page.evaluate(() => window.scrollTo(0, 0));
const plus = page.getByRole("button", { name: "Add a card" }).first();
await plus.click();
const picker = page.locator("[data-slot=popover-content]");
await picker.waitFor();
await page.waitForTimeout(200);
{
  const row = await page.getByRole("region", { name: "Key numbers" }).boundingBox(), pb = await picker.boundingBox();
  const y0 = row.y - 16;
  await shot("08-plus-picker.png", { clip: { x: row.x - 16, y: y0, width: row.width + 32, height: Math.max(row.y + row.height, pb.y + pb.height) - y0 + 16 } });
}
await picker.getByRole("button", { name: /Trial conversion/ }).click();
await plus.click();
await picker.getByRole("button", { name: /Churn/ }).click();
check((await cardCount()) === 6, "two extra cards added");
check((await plus.getAttribute("aria-disabled")) === "true", "(+) disabled at 2");
await page.getByRole("button", { name: "Remove Churn", exact: true }).click();
check((await cardCount()) === 5, "extra card removed");
await page.getByRole("button", { name: "Remove Trial conversion", exact: true }).click();

// 9. What changed: four tiles, each under its card; action links; Rico as "Ask Rico why".
const tiles = page.getByRole("region", { name: "What changed" });
await tiles.scrollIntoViewIfNeeded();
await page.waitForTimeout(150);
{
  const t = await tiles.boundingBox();
  await shot("09-what-changed-tiles.png", { clip: { x: t.x - 16, y: t.y - 16, width: t.width + 32, height: t.height + 32 } });
}
check((await tiles.getByRole("article").count()) === 4, "four tiles");
{
  // Each tile shares its card's column at 1280px.
  const cards = page.getByRole("region", { name: "Key numbers" }).locator("[data-slot=card]");
  for (let i = 0; i < 4; i++) {
    const c = await cards.nth(i).boundingBox(), t = await tiles.getByRole("article").nth(i).boundingBox();
    check(Math.abs(c.x - t.x) < 1 && Math.abs(c.width - t.width) < 1, `tile ${i + 1} aligned with card ${i + 1} (card ${Math.round(c.x)}/${Math.round(c.width)}, tile ${Math.round(t.x)}/${Math.round(t.width)})`);
  }
  const h = await cards.first().boundingBox();
  console.log(`card height at 1280px: ${Math.round(h.height)}px`);
}
await tiles.getByRole("button", { name: /Test a new paywall/ }).click();
await page.getByText("Would open Experiments with this segment pre-selected").waitFor();
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
await tiles.getByRole("button", { name: "Ask Rico why" }).first().click();
{
  const d = page.locator("[data-slot=sheet-content]");
  const msg = d.getByRole("textbox", { name: "Message Rico" });
  await msg.waitFor();
  check((await msg.inputValue()) === "MRR: Up 6.1%, 31 new annual subs", "Ask Rico why pre-fills the sentence");
  await msg.press("Enter");
  await d.getByText("31 new annual subscriptions drove most of it").waitFor();
  await msg.fill("Where did new customers go?");
  await msg.press("Enter");
  await d.getByText("Those cards moved off the defaults").waitFor();
  await d.getByRole("button", { name: "Add card" }).click();
  await page.waitForTimeout(300);
  check((await page.getByRole("button", { name: "Remove New customers", exact: true }).count()) === 1, "Rico's Add card appends New customers");
  await page.getByRole("button", { name: "Remove New customers", exact: true }).click();
}

const setState = async (state) => {
  await page.getByRole("combobox").filter({ hasText: /Normal|Below volume gate|New project/ }).click();
  await page.getByRole("option", { name: state }).click();
  await page.waitForTimeout(150);
};
// 7. Rico drawer: a chip, a typed question, mocked replies.
await page.evaluate(() => window.scrollTo(0, 0));
// 12. Rico mascot in the corner: hover jiggles it and shows the tooltip.
const mascot = page.getByRole("button", { name: "Ask Rico", exact: true });
await mascot.locator("canvas, svg").first().waitFor();
await mascot.hover();
await page.getByText("Ask Rico anything about this page").waitFor();
await page.waitForTimeout(120);
const m = await mascot.boundingBox();
await shot("12-rico-mascot-hover.png", { clip: { x: m.x - 260, y: m.y - 40, width: m.width + 284, height: m.height + 64 } });
await mascot.click();
const drawer = page.locator("[data-slot=sheet-content]");
await drawer.waitFor();
const msg = drawer.getByRole("textbox", { name: "Message Rico" });
await drawer.getByRole("button", { name: "Why did MRR go up?" }).click();
await drawer.getByText("drove most of it").last().waitFor();
await msg.fill("Is this number right?");
await msg.press("Enter");
await drawer.getByText("Customer cards are cached").last().waitFor();
await msg.fill("Why are trials down?");
await msg.press("Enter");
await drawer.getByText("Most of the drop is on Android").last().waitFor();
await shot("07-rico-drawer.png");
await drawer.getByRole("button", { name: "Open MRR chart" }).last().click();
await page.getByRole("dialog", { name: /MRR/ }).waitFor();
await page.keyboard.press("Escape");

// Exercise the other states and dialogs for console errors.
await setState("Below volume gate");
check((await page.getByText("Appears at 10+ transactions a week.").count()) === 4, "four muted tiles below the volume gate");
await shot("state-below-volume-gate.png", { fullPage: true });
await setState("New project");
check((await page.getByText("No data yet").count()) === 4, "4 empty cards in New project");
await shot("state-new-project.png", { fullPage: true });
await page.getByRole("switch").click();
await page.waitForTimeout(250);
await shot("state-new-project-sample-drawing.png");
await page.waitForTimeout(450);
check((await page.getByText("No data yet").count()) === 0, "sample data fills the cards");
await shot("state-new-project-sample.png", { fullPage: true });
await page.getByRole("switch").click();

// 6. New project, Proposed: setup checklist; a step opens the drawer; Mark done counts.
await page.getByRole("button", { name: "Install the SDK and configure Purchases" }).click();
await drawer.waitFor();
await page.waitForTimeout(250);
await shot("06-new-project-setup-drawer.png");
await drawer.getByRole("button", { name: /^Open / }).click();
await page.getByText("Would open API keys").waitFor();
await drawer.getByRole("checkbox").click();
await page.keyboard.press("Escape");
await page.getByText("3 of 6 done").waitFor();

// 10. Today, New project: the faithful "before" (onboarding block, Rico bar, 6 cards at 0).
await page.getByRole("tab", { name: "Today" }).click();
await page.waitForTimeout(300);
{
  const onboarding = page.getByRole("region", { name: "Onboarding" });
  await onboarding.getByText("(2 of 6)").waitFor(); // its own state, not the Proposed checklist's
  check((await onboarding.getByRole("article").count()) === 4, "4 open onboarding tasks");
  await page.getByText("No live transactions to show").waitFor();
  await onboarding.getByRole("button", { name: "Configure sandbox access" }).click();
  await page.getByText("Would open Sandbox access").waitFor();
  await onboarding.getByRole("button", { name: "Show completed" }).click();
  check((await onboarding.getByRole("article").count()) === 6, "Show completed reveals all 6");
  await onboarding.getByRole("button", { name: "Hide completed" }).click();
  await page.waitForTimeout(4500); // let the toast go before the screenshot
  await shot("10-today-new-project.png", { fullPage: true });
  await onboarding.getByRole("button", { name: "Mark as done" }).first().click();
  await onboarding.getByText("(3 of 6)").waitFor();
  check((await onboarding.getByRole("article").count()) === 3, "done task leaves the carousel");
}
await page.getByRole("tab", { name: "Proposed" }).click();
await setState("Normal");
await page.getByRole("button", { name: "Not on this page, and why →" }).click();
await page.getByRole("dialog").waitFor();
await page.keyboard.press("Escape");

// 13. Drag Rico to another corner: drop spots appear, it snaps to the nearest one.
{
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400); // let the last dialog's overlay finish closing
  const r = await mascot.boundingBox();
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(r.x + r.width / 2 - i * 70, r.y + r.height / 2 - i * 55);
  await page.waitForTimeout(150);
  await shot("13-rico-drag.png");
  await page.mouse.up();
  await page.waitForTimeout(500);
  const after = await mascot.boundingBox();
  check(after.x < 400 && after.y < 120, `Rico snapped to the top-left corner (${Math.round(after.x)},${Math.round(after.y)})`);
  await mascot.click();
  await page.locator("[data-slot=sheet-content]").waitFor();
  await page.keyboard.press("Escape");
}

// 5. Phone
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
phone.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await phone.goto(TARGET, { waitUntil: "networkidle" });
await phone.evaluate(() => document.fonts.ready);
let overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
await phone.screenshot({ path: OUT + "phone-full.png", fullPage: true });
// 05: New project on a phone, onboarding tasks stacked (no carousel).
await phone.getByRole("combobox").filter({ hasText: /Normal|Below volume gate|New project/ }).click();
await phone.getByRole("option", { name: "New project" }).click();
await phone.waitForTimeout(300);
await phone.screenshot({ path: OUT + "05-phone.png" });
await phone.screenshot({ path: OUT + "phone-new-project-full.png", fullPage: true });
overflow = Math.max(overflow, await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
await phone.getByRole("button", { name: "Ask Rico", exact: true }).click();
const phoneDrawer = await phone.locator("[data-slot=sheet-content]").boundingBox();
check(Math.round(phoneDrawer.width) === 390, `phone drawer full width (${phoneDrawer.width}px)`);
await phone.waitForTimeout(250);
await phone.screenshot({ path: OUT + "phone-rico.png" });

await browser.close();
console.log(`console errors: ${errors.length}`, errors);
console.log(`phone horizontal overflow: ${overflow}px`);
