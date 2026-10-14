// Takes the PRD screenshots (01-05) and the round 2 drawers (06-07) into ./screenshots. Needs the dev server: npm run dev
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
await shot("02-proposed-normal.png", { fullPage: true });

// 3. One card with the (i) popover open
const card = page.locator("[data-slot=card]", { hasText: "New customers" }).first();
await card.getByRole("button", { name: "What is New customers?" }).click();
const popover = page.locator("[data-slot=popover-content]");
await popover.waitFor();
const a = await card.boundingBox(), b = await popover.boundingBox();
const x = Math.min(a.x, b.x) - 16, y = Math.min(a.y, b.y) - 16;
await shot("03-card-detail.png", {
  clip: { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x + 16, height: Math.max(a.y + a.height, b.y + b.height) - y + 16 },
});
await page.keyboard.press("Escape");

// 4. What changed strip + chart modal with "as of" carried over
const strip = page.getByRole("region", { name: "What changed" });
await strip.scrollIntoViewIfNeeded();
await page.mouse.wheel(0, -260);
await strip.getByRole("button", { name: "Open MRR chart" }).click();
await page.getByRole("dialog").waitFor();
await page.waitForTimeout(250);
await shot("04-what-changed-and-modal.png");
await page.keyboard.press("Escape");

const setState = async (state) => {
  await page.getByRole("combobox").filter({ hasText: /Normal|Below volume gate|New project/ }).click();
  await page.getByRole("option", { name: state }).click();
  await page.waitForTimeout(150);
};
const check = (ok, what) => { if (!ok) errors.push(`check failed: ${what}`); };

// 7. Rico drawer: input text carries over, a chip, a typed question, mocked replies.
await page.evaluate(() => window.scrollTo(0, 0));
const rico = page.getByRole("textbox", { name: "Ask Rico about this page" });
await rico.pressSequentially("is ");
const drawer = page.locator("[data-slot=sheet-content]");
await drawer.waitFor();
const msg = drawer.getByRole("textbox", { name: "Message Rico" });
check((await msg.inputValue()) === "is ", "Rico draft carries over");
await drawer.getByRole("button", { name: "Why did MRR go up?" }).click();
await drawer.getByText("31 new annual subscriptions").waitFor();
await msg.fill("Is this number right?");
await msg.press("Enter");
await drawer.getByText("Customer cards are cached").waitFor();
await msg.fill("Why are trials down?");
await msg.press("Enter");
await drawer.getByText("Most of the drop is on Android").waitFor();
await shot("07-rico-drawer.png");
await drawer.getByRole("button", { name: "Open MRR chart" }).click();
await page.getByRole("dialog", { name: /MRR/ }).waitFor();
await page.keyboard.press("Escape");

// Exercise the other states and dialogs for console errors.
await setState("Below volume gate");
await shot("state-below-volume-gate.png", { fullPage: true });
await setState("New project");
check((await page.getByText("No data yet").count()) === 6, "6 empty cards in New project");
await shot("state-new-project.png", { fullPage: true });
await page.getByRole("switch").click();
await page.waitForTimeout(250);
await shot("state-new-project-sample-drawing.png");
await page.waitForTimeout(450);
check((await page.getByText("No data yet").count()) === 0, "sample data fills the cards");
await shot("state-new-project-sample.png", { fullPage: true });
await page.getByRole("switch").click();

// 6. Setup task drawer
await page.getByRole("button", { name: "Install the SDK and configure Purchases" }).click();
await drawer.waitFor();
await page.waitForTimeout(250);
await shot("06-new-project-setup-drawer.png");
await drawer.getByRole("button", { name: /^Open / }).click();
await page.getByText("Would open API keys").waitFor();
await drawer.getByRole("checkbox").click();
await page.keyboard.press("Escape");
await page.getByText("3 of 6 done").waitFor();
await setState("Normal");
await page.getByRole("button", { name: "Not on this page, and why →" }).click();
await page.getByRole("dialog").waitFor();
await page.keyboard.press("Escape");

// 5. Phone
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
phone.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await phone.goto(TARGET, { waitUntil: "networkidle" });
await phone.evaluate(() => document.fonts.ready);
await phone.screenshot({ path: OUT + "05-phone.png" });
const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
await phone.screenshot({ path: OUT + "phone-full.png", fullPage: true });
await phone.getByRole("textbox", { name: "Ask Rico about this page" }).click();
const phoneDrawer = await phone.locator("[data-slot=sheet-content]").boundingBox();
check(Math.round(phoneDrawer.width) === 390, `phone drawer full width (${phoneDrawer.width}px)`);
await phone.waitForTimeout(250);
await phone.screenshot({ path: OUT + "phone-rico.png" });

await browser.close();
console.log(`console errors: ${errors.length}`, errors);
console.log(`phone horizontal overflow: ${overflow}px`);
