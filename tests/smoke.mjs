import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const baseURL = process.env.MM_BASE_URL || 'http://localhost:5173';
const screenshotDir = resolve(process.env.MM_SCREENSHOT_DIR || '.screenshots');
await mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.MM_CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  headless: true,
  args: ['--no-sandbox'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(5000);
const runtimeErrors = [];
page.on('pageerror', error => runtimeErrors.push(error.message));
page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
const results = [];
async function check(name, work) {
  try { await work(); results.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, passed: false, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
}
const cards = () => page.locator('.stock-grid .car-card');
const status = value => page.locator('.stock-tabs button').filter({ hasText: new RegExp(`^${value}`) });
const reset = () => page.locator('.filter-applied button').click();
const goStock = () => page.goto(`${baseURL}/stock`);
const screenshot = name => page.screenshot({ path: resolve(screenshotDir, name), fullPage: true });

try {
  await page.goto(baseURL);
  await check('Home page and stock links', async () => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('PERFORMANCE.');
    await expect(page.locator('.featured .car-card')).toHaveCount(3);
    await page.getByRole('link', { name: 'Explore our stock', exact: true }).click();
    await expect(page).toHaveURL(/\/stock$/);
    await expect(cards()).toHaveCount(6);
  });
  await check('Available, sold and all stock', async () => {
    await status('Sold').click();
    await expect(cards()).toHaveCount(2);
    await expect(page.locator('.stock-grid .sold-tag')).toHaveCount(2);
    await status('All cars').click();
    await expect(cards()).toHaveCount(8);
    await status('Available').click();
    await expect(cards()).toHaveCount(6);
  });
  await check('Search and reset', async () => {
    await page.getByRole('textbox', { name: 'Search stock' }).fill('Clubsport');
    await expect(cards()).toHaveCount(1);
    await expect(cards().first()).toContainText('Clubsport R8');
    await page.getByRole('textbox', { name: 'Search stock' }).fill('no-such-car');
    await expect(cards()).toHaveCount(0);
    await expect(page.getByText('No cars in this lane.')).toBeVisible();
    await reset();
    await expect(cards()).toHaveCount(6);
  });
  await check('Make filter', async () => {
    await page.getByRole('checkbox', { name: /^HSV/ }).check();
    await expect(cards()).toHaveCount(3);
    for (const text of await cards().allTextContents()) expect(text).toContain('HSV');
    await reset();
  });
  await check('Transmission and maximum price filters', async () => {
    await page.getByRole('combobox', { name: /^Transmission/ }).selectOption('Manual');
    await expect(cards()).toHaveCount(2);
    await page.getByRole('combobox', { name: /^Maximum price/ }).selectOption('60000');
    await expect(cards()).toHaveCount(1);
    await expect(cards().first()).toContainText('Clubsport R8');
    await reset();
  });
  await check('Body style filter', async () => {
    await page.getByLabel('Ute', { exact: true }).check();
    await expect(cards()).toHaveCount(2);
    await page.getByRole('button', { name: 'All body styles', exact: true }).click();
    await expect(cards()).toHaveCount(6);
  });
  await check('Sorting by price and kilometres', async () => {
    await page.getByLabel('Sort stock').selectOption('price-low');
    const prices = await page.locator('.stock-grid .card-bottom strong').allTextContents();
    expect(prices.map(s => +s.replace(/\D/g, ''))).toEqual([57990, 59990, 64990, 67990, 69990, 94990]);
    await page.getByLabel('Sort stock').selectOption('price-high');
    await expect(cards().first()).toContainText('GTS');
    await page.getByLabel('Sort stock').selectOption('kms');
    await expect(cards().first()).toContainText('Mustang GT');
    await page.getByLabel('Sort stock').selectOption('newest');
  });
  await check('Save a car and persist saved state', async () => {
    const firstSave = cards().first().getByRole('button', { name: /^Save / });
    await firstSave.click();
    await expect(cards().first().getByRole('button', { name: /^Unsave / })).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await page.locator('.saved-button').click();
    await expect(cards()).toHaveCount(1);
    await expect(cards().first()).toContainText('Mustang GT');
    await page.locator('.saved-button').click();
    await expect(cards()).toHaveCount(6);
  });
  await check('Vehicle detail and carousel', async () => {
    await page.goto(`${baseURL}/stock/hsv-gts-2016`);
    await expect(page.locator('.vehicle-summary h1')).toHaveText('GTS');
    await expect(page.locator('.gallery-count')).toHaveText('01 / 05');
    await page.getByRole('button', { name: 'Next vehicle photo', exact: true }).click();
    await expect(page.locator('.gallery-count')).toHaveText('02 / 05');
    await page.getByRole('button', { name: 'Previous vehicle photo', exact: true }).click();
    await expect(page.locator('.gallery-count')).toHaveText('01 / 05');
    await page.getByRole('button', { name: 'Previous vehicle photo', exact: true }).click();
    await expect(page.locator('.gallery-count')).toHaveText('05 / 05');
    await page.getByRole('button', { name: 'Show vehicle photo 3', exact: true }).click();
    await expect(page.locator('.gallery-count')).toHaveText('03 / 05');
    await expect(page.getByRole('button', { name: 'Show vehicle photo 3', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });
  await check('Expanded gallery, keyboard arrows and Escape', async () => {
    await page.getByRole('button', { name: 'Expand vehicle photos', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Vehicle photo gallery' })).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.lightbox-controls span')).toHaveText('4 / 5');
    await page.getByRole('button', { name: 'Previous expanded photo' }).click();
    await expect(page.locator('.lightbox-controls span')).toHaveText('3 / 5');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
  await check('Overview and specification tabs', async () => {
    await page.getByRole('tab', { name: 'Specifications' }).click();
    await expect(page.getByRole('tab', { name: 'Specifications' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#specifications-panel')).toContainText('430 kW');
    await expect(page.locator('#specifications-panel')).toContainText('MM101');
    await page.getByRole('tab', { name: 'Overview' }).click();
    await expect(page.locator('#overview-panel')).toBeVisible();
  });
  await check('Repayment calculator updates at zero interest', async () => {
    await page.locator('.finance-toggle').click();
    await page.getByLabel('Deposit', { exact: true }).fill('20000');
    await page.getByRole('combobox', { name: /^Term/ }).selectOption('3');
    await page.getByLabel('Annual interest rate').fill('0');
    const weekly = Math.round((94990 - 20000) / 36 * 12 / 52);
    await expect(page.locator('.finance-toggle b')).toHaveText(`$${weekly} / week`);
    await expect(page.locator('.finance p')).toContainText('3-year term, 0% p.a., $20,000 deposit');
  });
  await check('Enquiry preparation and SMS link', async () => {
    await page.getByRole('button', { name: 'Enquire about this car', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Enquire with MM Prestige Motors' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Your name').fill('Website QA');
    await dialog.getByLabel('Phone number').fill('0400000000');
    await expect(dialog.getByLabel('Your message')).toHaveValue(/2016 HSV GTS/);
    await dialog.getByRole('button', { name: 'Prepare enquiry' }).click();
    await expect(dialog.getByText('Your message is ready.')).toBeVisible();
    const href = await dialog.getByRole('link', { name: 'Send via SMS' }).getAttribute('href');
    expect(href.startsWith('sms:+61411710409?body=')).toBeTruthy();
    const message = decodeURIComponent(href.split('?body=')[1]);
    expect(message).toContain('2016 HSV GTS');
    expect(message).toContain('Name: Website QA');
    expect(message).toContain('Phone: 0400000000');
    await dialog.getByRole('button', { name: 'Edit your message' }).click();
    await expect(dialog.getByLabel('Your name')).toHaveValue('Website QA');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
  await check('Sold vehicle hides price and offers similar cars', async () => {
    await page.goto(`${baseURL}/stock/hsv-clubsport-2012`);
    await expect(page.locator('.sold-word')).toHaveText('SOLD');
    await expect(page.locator('.finance')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Find me something similar' })).toBeVisible();
  });
  await check('Three colour palettes and persistence', async () => {
    for (const [theme, name] of [['blue', 'Midnight blue'], ['green', 'Racing green'], ['red', 'Performance red']]) {
      if (!(await page.locator('.palette-panel').isVisible())) await page.getByRole('button', { name: 'Compare colour palettes' }).click();
      await page.locator('.palette-panel').getByRole('button', { name: new RegExp(name) }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(await page.evaluate(() => localStorage.getItem('mm-theme'))).toBe(theme);
    }
  });
  await check('Footer story link scrolls from stock to about', async () => {
    await goStock();
    await page.locator('.footer').getByRole('link', { name: 'Our story', exact: true }).click();
    await expect(page).toHaveURL(/\/#about$/);
    await page.waitForTimeout(600);
    const rect = await page.locator('#about').boundingBox();
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeLessThan(200);
  });
  await page.goto(baseURL);
  await screenshot('home-desktop.png');
  await goStock();
  await screenshot('stock-desktop.png');
  await page.goto(`${baseURL}/stock/hsv-gts-2016`);
  await screenshot('vehicle-desktop.png');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL);
  await check('Mobile navigation opens, navigates and closes', async () => {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByRole('button', { name: 'Close navigation' })).toHaveAttribute('aria-expanded', 'true');
    await page.locator('.nav').getByRole('link', { name: 'Our stock', exact: true }).click();
    await expect(page).toHaveURL(/\/stock$/);
    await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false');
  });
  await check('Mobile navigation closes on sold query navigation', async () => {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.locator('.nav').getByRole('link', { name: 'Sold cars', exact: true }).click();
    await expect(page).toHaveURL(/\/stock\?status=sold$/);
    await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false');
  });
  await goStock();
  await check('Mobile filters show results and reset', async () => {
    await page.getByRole('button', { name: /^Filters/ }).click();
    await expect(page.locator('.filters')).toHaveClass(/filters-open/);
    await page.getByRole('checkbox', { name: /^Ford/ }).check();
    await page.getByRole('button', { name: 'Show 1 cars', exact: true }).click();
    await expect(page.locator('.filters')).not.toHaveClass(/filters-open/);
    await expect(cards()).toHaveCount(1);
    await page.getByRole('button', { name: /^Filters/ }).click();
    await reset();
    await page.getByRole('button', { name: 'Show 6 cars', exact: true }).click();
    await expect(cards()).toHaveCount(6);
  });
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1024 });
    for (const [name, route] of [['home', '/'], ['stock', '/stock'], ['vehicle', '/stock/hsv-gts-2016']]) {
      await check(`No horizontal overflow on ${name} at ${width}px`, async () => {
        await page.goto(`${baseURL}${route}`);
        await page.waitForTimeout(250);
        const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
        expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
        await screenshot(`${name}-${width}.png`);
      });
    }
  }
  await check('All local images load', async () => {
    for (const route of ['/', '/stock?status=all', '/stock/hsv-gts-2016']) {
      await page.goto(`${baseURL}${route}`);
      await page.locator('footer').scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      const missing = await page.locator('img').evaluateAll(images => images.filter(i => !i.complete || !i.naturalWidth).map(i => i.src));
      expect(missing).toEqual([]);
    }
  });
  await check('No browser runtime errors', async () => { expect(runtimeErrors).toEqual([]); });
} finally {
  await writeFile(resolve(screenshotDir, 'functional-results.json'), JSON.stringify({ baseURL, results, runtimeErrors }, null, 2));
  await browser.close();
}
const failed = results.filter(result => !result.passed);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
