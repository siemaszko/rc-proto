// Takes the 5 PRD screenshots into ./screenshots. Needs the dev server: npm run dev
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

// Exercise the other states and dialogs for console errors.
for (const state of ["Below volume gate", "New project", "Normal"]) {
  await page.getByRole("combobox").filter({ hasText: /Normal|Below volume gate|New project/ }).click();
  await page.getByRole("option", { name: state }).click();
  await page.waitForTimeout(150);
  if (state !== "Normal") await shot(`state-${state.toLowerCase().replaceAll(" ", "-")}.png`, { fullPage: true });
}
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

await browser.close();
console.log(`console errors: ${errors.length}`, errors);
console.log(`phone horizontal overflow: ${overflow}px`);
