// End-to-end checks for the stock manager (/stock/manage) and the website it
// feeds. Starts its own Vite dev server with an empty, temporary stock
// folder and the sample rego lookups, so it never touches real data.
// Run `npm run test:stock` (or `node tests/stock-admin.mjs`).
import { chromium, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const storeDir = await mkdtemp(join(tmpdir(), "mm-stock-"));
const PASSWORD = "test-password-123";
process.env.STOCK_DEV_DIR = storeDir;
process.env.STOCK_ADMIN_PASSWORD = PASSWORD;
delete process.env.REGCHECK_USERNAME;
const server = await createServer({
  root,
  configFile: join(root, "vite.config.js"),
  logLevel: "error",
  server: { host: "127.0.0.1", port: 5191 },
});
await server.listen();
const baseURL = server.resolvedUrls.local[0].replace(/\/$/, "");

const screenshotDir = resolve(process.env.MM_SCREENSHOT_DIR || ".screenshots");
await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.MM_CHROMIUM_PATH || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const runtimeErrors = [];
const watch = (target) => {
  target.on("pageerror", (error) => runtimeErrors.push(error.message));
  target.on("console", (message) => {
    // A refused request (401/404/409) is logged by the browser; the checks
    // below expect those, so only script errors count.
    if (message.type() === "error" && !/Failed to load resource/.test(message.text())) runtimeErrors.push(message.text());
  });
};
watch(page);
const results = [];
async function check(name, work) {
  try {
    await work();
    results.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, passed: false });
    console.error(`FAIL ${name}: ${error.message.split("\n")[0]}`);
  }
}
const screenshot = (name) => page.screenshot({ path: resolve(screenshotDir, `stock-admin-${name}.png`), fullPage: true });
const button = (name, target = page) => target.getByRole("button", { name, exact: true });
const photosOnDisk = async () => (existsSync(join(storeDir, "photos")) ? readdir(join(storeDir, "photos")) : []);
async function publicPage(path) {
  const other = await context.newPage();
  watch(other);
  await other.goto(`${baseURL}${path}`);
  await other.waitForLoadState("networkidle");
  return other;
}
async function noOverflow() {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll).toBeLessThanOrEqual(client);
}
const photoFiles = [join(root, "public/images/hsv-gts-genf-front.jpg"), join(root, "public/images/hsv-gts-genf-rear.jpg")];

try {
  await check("Signing in needs the password", async () => {
    await page.goto(`${baseURL}/stock/manage`);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page).toHaveTitle("Stock manager | MM Prestige Motors");
    await page.getByLabel("Password").fill("not the password");
    await button("Sign in").click();
    await expect(page.getByRole("alert")).toHaveText("That password isn't right.");
    await page.getByLabel("Password").fill(PASSWORD);
    await button("Sign in").click();
    await expect(page.getByRole("heading", { name: "Your stock" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No cars yet" })).toBeVisible();
    await noOverflow();
    await screenshot("empty");
  });
  await check("The session cookie is private to the API, and the API refuses requests without it or its header", async () => {
    const cookie = (await context.cookies()).find((item) => item.name === "mm_stock");
    expect(cookie?.httpOnly && cookie.sameSite === "Strict" && cookie.path === "/api/stock").toBeTruthy();
    const anonymous = await browser.newContext();
    const stock = await anonymous.request.get(`${baseURL}/api/stock?op=stock`);
    expect(stock.status()).toBe(401);
    const noHeader = await anonymous.request.post(`${baseURL}/api/stock?op=login`, { data: { password: PASSWORD } });
    expect(noHeader.status()).toBe(403);
    await anonymous.close();
  });
  await check("A rego lookup finds the car and says what the rego record doesn't include", async () => {
    await button("Add a car").first().click();
    await expect(page.getByRole("heading", { name: "Add a car" })).toBeVisible();
    await page.getByLabel("Rego").fill("s123 abc");
    await expect(page.getByLabel("Rego")).toHaveValue("S123 ABC");
    await page.getByText("SA", { exact: true }).click();
    await button("Find the car").click();
    const result = page.locator(".sa-result");
    await expect(result.getByRole("heading", { name: "2016 HSV GTS" })).toBeVisible();
    await expect(result).toContainText("6G1FK5EP0GL303518");
    await expect(result).toContainText("14 Mar 2027");
    await expect(result).toContainText("Not in the rego record: variant, gearbox, engine.");
    await noOverflow();
    await screenshot("found");
  });
  await check("Using the lookup fills in the form and marks what came from the rego", async () => {
    await button("Use these details").click();
    await expect(page.getByRole("heading", { name: "2016 HSV GTS" })).toBeVisible();
    await expect(page.getByLabel(/^Year/)).toHaveValue("2016");
    await expect(page.getByLabel(/^Make/)).toHaveValue("HSV");
    await expect(page.getByLabel(/^Model/)).toHaveValue("GTS");
    await expect(page.getByLabel(/^Body/)).toHaveValue("Sedan");
    await expect(page.getByLabel(/^Colour/)).toHaveValue("Red");
    await expect(page.getByLabel("Rego", { exact: true })).toHaveValue("S123ABC");
    await expect(page.getByLabel(/^VIN/)).toHaveValue("6G1FK5EP0GL303518");
    await expect(page.getByLabel(/^Rego expires/)).toHaveValue("2027-03-14");
    expect(await page.locator(".sa-from").count()).toBeGreaterThanOrEqual(7);
    await expect(page.locator(".sa-banner")).toContainText("S123ABC (SA)");
  });
  await check("A car can't go on the website without a photo", async () => {
    await page.getByLabel(/^Kilometres/).fill("58,420");
    await page.getByLabel(/^Price/).fill("$94,990");
    await button("Put on the website").click();
    await expect(page.locator(".sa-form-error")).toHaveText("To put it on the website, add a photo.");
  });
  await check("Photos are resized in the browser into the website's sizes, with a link-preview crop", async () => {
    await page.locator('input[type="file"]').setInputFiles(photoFiles);
    await expect(page.locator(".sa-photos li.is-ready")).toHaveCount(2, { timeout: 60000 });
    await expect(page.locator(".sa-cover")).toHaveCount(1);
    const files = await photosOnDisk();
    expect(files.length).toBe(10);
    for (const width of [480, 960, 1600, 2400])
      expect(files.filter((file) => file.endsWith(`-${width}.webp`)).length, `${width}`).toBe(2);
    const small = files.find((file) => file.endsWith("-480.webp"));
    expect((await sharp(join(storeDir, "photos", small)).metadata()).width).toBe(480);
    const share = await sharp(join(storeDir, "photos", files.find((file) => file.endsWith("-share.jpg")))).metadata();
    expect([share.width, share.height, share.format]).toEqual([1200, 630, "jpeg"]);
    await page.getByLabel(/^Variant/).fill("Gen-F2 · Supercharged sedan");
    await page.getByLabel(/^Gearbox/).selectOption("Automatic");
    await page.getByLabel(/^Engine/).fill("6.2L supercharged V8");
    await page.getByLabel("Description").fill("First paragraph.\n\nSecond paragraph.");
    await noOverflow();
    await screenshot("edit");
  });
  await check("Putting the car on the website lists it under On the website", async () => {
    await button("Put on the website").click();
    await expect(page.getByRole("heading", { name: "Your stock" })).toBeVisible();
    await expect(page.locator(".sa-toast")).toContainText("Saved.");
    await expect(page.getByRole("tab", { name: /On the website/ })).toContainText("1");
    await expect(page.locator(".sa-car")).toContainText("$94,990 · 58,420 km · S123ABC SA");
  });
  await check("The website shows the stock manager's cars instead of the samples", async () => {
    const stock = await publicPage("/stock");
    await expect(stock.locator(".collection-card")).toHaveCount(1);
    await expect(stock.locator(".collection-card")).toContainText("HSV GTS");
    await expect(stock.getByText("Sample prices and details")).toHaveCount(0);
    const listing = await publicPage("/stock/hsv-gts-2016");
    await expect(listing.getByRole("heading", { level: 1 })).toHaveText("2016 HSV GTS");
    await expect(listing.locator(".vehicle-price-card")).toContainText("$94,990");
    await expect(listing.locator(".vehicle-sub")).toContainText("Gen-F2 · Supercharged sedan");
    await expect(listing.locator(".vehicle-about p")).toHaveCount(2);
    expect(await listing.locator("img[srcset*='/api/stock/dev-photo/']").count()).toBeGreaterThan(0);
    const html = await listing.content();
    expect(html.includes("S123ABC") || html.includes("6G1FK5EP0GL303518")).toBe(false);
    await expect(listing.locator(".footer-bottom")).toContainText("Call to confirm availability.");
    const home = await publicPage("/");
    await expect(home.locator(".featured .car-card")).toHaveCount(1);
    await expect(home.getByRole("button", { name: "Next featured cars" })).toBeDisabled();
    for (const other of [stock, listing, home]) await other.close();
  });
  await check("Editing a car on the website updates its listing", async () => {
    await page.locator(".sa-car").first().click();
    await page.getByLabel(/^Price/).fill("92990");
    await button("Move photo 2 earlier").click();
    await button("Save changes").click();
    await expect(page.getByRole("heading", { name: "Your stock" })).toBeVisible();
    const listing = await publicPage("/stock/hsv-gts-2016");
    await expect(listing.locator(".vehicle-price-card")).toContainText("$92,990");
    const firstPhoto = await listing.locator(".collection-card img, .vehicle-gallery img").first().getAttribute("src");
    expect(firstPhoto).toContain("/api/stock/dev-photo/");
    await listing.close();
  });
  await check("Marking a car sold moves it to Sold, here and on the website", async () => {
    await page.locator(".sa-car").first().click();
    await button("Mark as sold").click();
    await expect(page.getByRole("tab", { name: /Sold/ })).toContainText("1");
    const sold = await publicPage("/stock?status=sold");
    await expect(sold.locator(".collection-card")).toContainText("HSV GTS");
    await expect(sold.locator(".sold-tag")).toHaveCount(1);
    const home = await publicPage("/");
    await expect(home.locator(".stock-empty")).toContainText("New arrivals are on the way.");
    await expect(home.locator(".carousel-controls")).toBeHidden();
    await sold.close();
    await home.close();
  });
  await check("Lookups that fail, find a stolen car or find stock you already have say so", async () => {
    await button("Add a car").first().click();
    await page.getByLabel("Rego").fill("ZZZ999");
    await button("Find the car").click();
    await expect(page.locator(".sa-result.is-error h2")).toHaveText("No match for ZZZ999 in SA");
    await page.getByLabel("Rego").fill("S123ABC");
    await expect(page.locator(".sa-already")).toContainText("Already in your stock: 2016 HSV GTS (sold).");
    await page.getByLabel("Rego").fill("STOLEN1");
    await page.getByText("VIC", { exact: true }).click();
    await button("Find the car").click();
    await expect(page.locator(".sa-warning")).toContainText("recorded as stolen");
    await page.getByRole("radio", { name: "VIN" }).click();
    await page.getByLabel(/^VIN/).fill("6G1FK5EP0GL303518");
    await expect(page.locator(".sa-already")).toBeVisible();
    await button("Find the car").click();
    await expect(page.locator(".sa-result h2")).toHaveText("2016 Holden Commodore");
    await button("Stock").click();
  });
  await check("A save from out-of-date stock on another device is refused", async () => {
    const other = await context.newPage();
    watch(other);
    await other.goto(`${baseURL}/stock/manage?car=hsv-gts-2016`);
    await expect(other.getByLabel(/^Price/)).toHaveValue("92990");
    await page.getByRole("tab", { name: /Sold/ }).click();
    await page.locator(".sa-car").first().click();
    await page.getByLabel(/^Colour/).fill("Sting Red");
    await button("Save changes").click();
    await expect(page.getByRole("heading", { name: "Your stock" })).toBeVisible();
    await other.getByLabel(/^Price/).fill("91990");
    await button("Save changes", other).click();
    await expect(other.locator(".sa-toast")).toContainText("changed on another device");
    await expect(button("Reload", other)).toBeVisible();
    await other.close();
  });
  await check("Leaving a car with unsaved changes asks first", async () => {
    await page.getByRole("tab", { name: /Sold/ }).click();
    await page.locator(".sa-car").first().click();
    await page.getByLabel(/^Colour/).fill("Red Hot");
    let question = page.waitForEvent("dialog");
    await button("Stock").click();
    await (await question).dismiss();
    await expect(page.getByLabel(/^Colour/)).toHaveValue("Red Hot");
    // The browser's Back button asks too.
    question = page.waitForEvent("dialog");
    await page.goBack();
    await (await question).dismiss();
    await expect(page.getByLabel(/^Colour/)).toHaveValue("Red Hot");
    question = page.waitForEvent("dialog");
    await button("Stock").click();
    await (await question).accept();
    await expect(page.getByRole("heading", { name: "Your stock" })).toBeVisible();
  });
  await check("If the session runs out mid-edit, signing in again keeps the changes", async () => {
    await page.getByRole("tab", { name: /Sold/ }).click();
    await page.locator(".sa-car").first().click();
    await page.getByLabel(/^Colour/).fill("Phantom Black");
    await context.clearCookies();
    await button("Save changes").click();
    const again = page.getByRole("dialog", { name: "Sign in again" });
    await expect(again).toBeVisible();
    await again.getByLabel("Password").fill(PASSWORD);
    await button("Sign in", again).click();
    await expect(again).toBeHidden();
    await expect(page.getByLabel(/^Colour/)).toHaveValue("Phantom Black");
    await button("Save changes").click();
    await expect(page.getByRole("heading", { name: "Your stock" })).toBeVisible();
    await page.getByRole("tab", { name: /Sold/ }).click();
    await page.locator(".sa-car").first().click();
    await expect(page.getByLabel(/^Colour/)).toHaveValue("Phantom Black");
    await button("Stock").click();
  });
  await check("Deleting a car removes it and its photos, and the website goes back to the samples", async () => {
    await page.getByRole("tab", { name: /Sold/ }).click();
    await page.locator(".sa-car").first().click();
    await page.getByRole("button", { name: "Delete this car" }).click();
    await button("Delete").click();
    await expect(page.getByRole("heading", { name: "No cars yet" })).toBeVisible();
    expect(await photosOnDisk()).toEqual([]);
    const stock = await publicPage("/stock");
    await expect(stock.getByText("Ferrari 360 Modena").first()).toBeVisible();
    await stock.close();
  });
  await check("Copying in the current listings makes drafts that keep their web addresses when published", async () => {
    await button("Copy in the current listings").click();
    await expect(page.getByRole("tab", { name: /Drafts/ })).toContainText("6");
    await expect(page.locator(".sa-car em").first()).toHaveText("Copied from the old listings · check the details");
    await page.getByRole("button", { name: /2016 HSV GTS/ }).click();
    await expect(page.locator(".sa-banner.is-warn")).toBeVisible();
    await button("Put on the website").click();
    await expect(page.getByRole("tab", { name: /On the website/ })).toContainText("1");
    const listing = await publicPage("/stock/hsv-gts-2016");
    await expect(listing.getByRole("heading", { level: 1 })).toHaveText("2016 HSV GTS");
    const stock = await publicPage("/stock");
    await expect(stock.locator(".collection-card")).toHaveCount(1);
    await listing.close();
    await stock.close();
    const again = await page.request.post(`${baseURL}/api/stock?op=import`, {
      headers: { "x-mm-stock": "1" },
      data: {},
    });
    expect((await again.json()).imported).toBe(0);
  });
  await check("The stock manager fits a phone screen", async () => {
    for (const path of ["/stock/manage", "/stock/manage?add=1", "/stock/manage?car=hsv-gts-2016"]) {
      await page.goto(`${baseURL}${path}`);
      await page.locator(".sa-main h1").waitFor();
      await noOverflow();
    }
  });
  await check("Signing out ends the session", async () => {
    await page.goto(`${baseURL}/stock/manage`);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    const after = await page.request.get(`${baseURL}/api/stock?op=stock`);
    expect(after.status()).toBe(401);
  });
  await check("No runtime errors", async () => {
    expect(runtimeErrors).toEqual([]);
  });
} finally {
  await browser.close();
  await server.close();
  await rm(storeDir, { recursive: true, force: true });
}

const failed = results.filter((result) => !result.passed);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
