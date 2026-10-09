import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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
const mutationRequests = [];
page.on('pageerror', error => runtimeErrors.push(error.message));
page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
page.on('request', request => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) {
    mutationRequests.push({ method: request.method(), url: request.url() });
  }
});
const results = [];

async function check(name, work) {
  try {
    await work();
    results.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

const screenshot = name => page.screenshot({ path: resolve(screenshotDir, name), fullPage: true });
const preview = () => page.getByTestId('stock-preview');
const vehicleCard = id => preview().locator(`[data-testid="preview-card"][data-vehicle-id="${id}"]`);
const button = name => page.getByRole('button', { name, exact: true });
const reset = () => button('Reset demo').click();

async function counts(available, sold) {
  await expect(page.getByTestId('preview-available-count')).toHaveText(String(available));
  await expect(page.getByTestId('preview-sold-count')).toHaveText(String(sold));
}

async function exampleDraft() {
  await button('Add new vehicle').click();
  await button('Use example photos').click();
  await button('Done with photos').click();
  await button('Use example rego').click();
  await button('SA').click();
  await button('These details are right').click();
  await button('Use 72,850 km').click();
  await button('Use $64,990').click();
  await expect(button('Publish listing')).toBeVisible();
}

async function chooseVehicle(action, id = 'hsv-gts-2016') {
  await button(action).click();
  await page.getByLabel('Vehicle to manage', { exact: true }).selectOption(id);
  await button('Continue with vehicle').click();
}

async function noOverflow() {
  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
}

try {
  await page.goto(`${baseURL}/stock-manager`);
  await check('Concept opens with the original website stock', async () => {
    await expect(page.getByText('Interactive concept', { exact: true })).toBeVisible();
    await expect(button('Add new vehicle')).toBeVisible();
    await expect(button('Update listing')).toBeVisible();
    await expect(button('Mark vehicle sold')).toBeVisible();
    await counts(6, 2);
    await expect(preview().getByTestId('preview-card')).toHaveCount(6);
    await screenshot('stock-manager-desktop.png');
  });

  await check('Photos, rego, state and details stay a draft until publishing', async () => {
    await reset();
    await exampleDraft();
    await counts(6, 2);
    await expect(vehicleCard('demo-vehicle-1')).toHaveCount(0);
    await screenshot('stock-manager-review-desktop.png');
    await button('Publish listing').click();
    await counts(7, 2);
    await expect(vehicleCard('demo-vehicle-1')).toContainText('Holden');
    await expect(vehicleCard('demo-vehicle-1')).toContainText('72,850');
    await expect(vehicleCard('demo-vehicle-1')).toContainText('$64,990');
    await expect(vehicleCard('demo-vehicle-1')).toHaveAttribute('data-status', 'available');
    await button('Back to menu').click();
    await expect(button('Add new vehicle')).toBeVisible();
    await counts(7, 2);
  });

  await check('A local photo can be attached without publishing inventory', async () => {
    await reset();
    await button('Add new vehicle').click();
    await page.getByLabel('Upload vehicle photos', { exact: true }).setInputFiles(
      fileURLToPath(new URL('../public/images/car-2.jpg', import.meta.url)),
    );
    await expect(button('Done with photos')).toBeEnabled();
    await button('Done with photos').click();
    await expect(button('Use example rego')).toBeVisible();
    await counts(6, 2);
    await expect(vehicleCard('demo-vehicle-1')).toHaveCount(0);
  });

  await check('An unknown rego opens manual details without changing inventory', async () => {
    await reset();
    await button('Add new vehicle').click();
    await button('Use example photos').click();
    await button('Done with photos').click();
    await page.getByLabel('Registration number', { exact: true }).fill('XYZ999');
    await button('Send message').click();
    await button('VIC').click();
    await expect(page.getByLabel('Year', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Make', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Model', { exact: true })).toBeVisible();
    await expect(button('Use these details')).toBeVisible();
    await counts(6, 2);
    await expect(vehicleCard('demo-vehicle-1')).toHaveCount(0);
  });

  await check('Manual vehicle details work when registration lookup is unavailable', async () => {
    await reset();
    await button('Add new vehicle').click();
    await button('Use example photos').click();
    await button('Done with photos').click();
    await button('Enter details manually').click();
    await page.getByLabel('Year', { exact: true }).fill('2018');
    await page.getByLabel('Make', { exact: true }).fill('Ford');
    await page.getByLabel('Model', { exact: true }).fill('Mustang GT');
    await page.getByLabel('Transmission', { exact: true }).selectOption('Manual');
    await button('Use these details').click();
    await page.getByLabel('Kilometres', { exact: true }).fill('45123');
    await button('Send message').click();
    await page.getByLabel('Asking price', { exact: true }).fill('57900');
    await button('Send message').click();
    await counts(6, 2);
    await expect(vehicleCard('demo-vehicle-1')).toHaveCount(0);
    await button('Publish listing').click();
    await counts(7, 2);
    await expect(vehicleCard('demo-vehicle-1')).toContainText('Ford');
    await expect(vehicleCard('demo-vehicle-1')).toContainText('Mustang GT');
    await expect(vehicleCard('demo-vehicle-1')).toContainText('2018');
    await expect(vehicleCard('demo-vehicle-1')).toContainText('45,123');
    await expect(vehicleCard('demo-vehicle-1')).toContainText('$57,900');
  });

  await check('Price edits affect the preview only after Save changes', async () => {
    await reset();
    await chooseVehicle('Update listing');
    await button('Change price').click();
    await page.getByLabel('Asking price', { exact: true }).fill('88000');
    await button('Send message').click();
    await expect(vehicleCard('hsv-gts-2016')).toContainText('$94,990');
    await expect(vehicleCard('hsv-gts-2016')).not.toContainText('$88,000');
    await counts(6, 2);
    await button('Save changes').click();
    await expect(vehicleCard('hsv-gts-2016')).toContainText('$88,000');
    await expect(vehicleCard('hsv-gts-2016')).not.toContainText('$94,990');
    await counts(6, 2);
    await button('Back to menu').click();
    await expect(vehicleCard('hsv-gts-2016')).toContainText('$88,000');
  });

  await check('Replacement photos appear in the draft before changing the saved listing', async () => {
    await reset();
    await chooseVehicle('Update listing');
    await button('Replace photos').click();
    await button('Use example photos').click();
    await button('Done with photos').click();
    await expect(preview().getByTestId('draft-card').locator('.sm-listing-photo img')).toHaveAttribute('src', '/images/car-4.jpg');
    await expect(vehicleCard('hsv-gts-2016').locator('.sm-listing-photo img')).toHaveAttribute('src', '/images/car-1.jpg');
    await counts(6, 2);
    await button('Save changes').click();
    await expect(preview().getByTestId('draft-card')).toHaveCount(0);
    await expect(vehicleCard('hsv-gts-2016').locator('.sm-listing-photo img')).toHaveAttribute('src', '/images/car-4.jpg');
    await counts(6, 2);
  });

  await check('Marking sold requires confirmation and moves the car between stock tabs', async () => {
    await reset();
    await chooseVehicle('Mark vehicle sold');
    await counts(6, 2);
    await expect(vehicleCard('hsv-gts-2016')).toHaveAttribute('data-status', 'available');
    await button('Confirm sold').click();
    await counts(5, 3);
    await expect(vehicleCard('hsv-gts-2016')).toHaveAttribute('data-status', 'sold');
    await expect(vehicleCard('hsv-gts-2016')).not.toContainText('$94,990');
    await expect(preview().getByTestId('preview-card')).toHaveCount(3);
    await screenshot('stock-manager-sold-desktop.png');
    await preview().getByRole('button', { name: 'Available', exact: true }).click();
    await expect(vehicleCard('hsv-gts-2016')).toHaveCount(0);
    await expect(preview().getByTestId('preview-card')).toHaveCount(5);
    await preview().getByRole('button', { name: 'Sold', exact: true }).click();
    await expect(vehicleCard('hsv-gts-2016')).toHaveAttribute('data-status', 'sold');
  });

  await check('Cancelling drafts and keeping a car available leaves inventory untouched', async () => {
    await reset();
    await exampleDraft();
    await button('Cancel listing').click();
    await counts(6, 2);
    await expect(vehicleCard('demo-vehicle-1')).toHaveCount(0);
    await chooseVehicle('Update listing');
    await button('Change price').click();
    await page.getByLabel('Asking price', { exact: true }).fill('88000');
    await button('Send message').click();
    await button('Cancel changes').click();
    await expect(vehicleCard('hsv-gts-2016')).toContainText('$94,990');
    await chooseVehicle('Mark vehicle sold');
    await button('Keep available').click();
    await counts(6, 2);
    await expect(vehicleCard('hsv-gts-2016')).toHaveAttribute('data-status', 'available');
    await expect(button('Add new vehicle')).toBeVisible();
  });

  await check('Reset demo restores prices, statuses and the original inventory', async () => {
    await reset();
    await exampleDraft();
    await button('Publish listing').click();
    await counts(7, 2);
    await button('Back to menu').click();
    await chooseVehicle('Update listing');
    await button('Change price').click();
    await page.getByLabel('Asking price', { exact: true }).fill('88000');
    await button('Send message').click();
    await button('Save changes').click();
    await button('Back to menu').click();
    await chooseVehicle('Mark vehicle sold');
    await button('Confirm sold').click();
    await counts(6, 3);
    await reset();
    await counts(6, 2);
    await expect(vehicleCard('demo-vehicle-1')).toHaveCount(0);
    await expect(vehicleCard('hsv-gts-2016')).toHaveAttribute('data-status', 'available');
    await expect(vehicleCard('hsv-gts-2016')).toContainText('$94,990');
    await expect(button('Add new vehicle')).toBeVisible();
  });

  await check('The public website inventory stays unchanged by the concept', async () => {
    await exampleDraft();
    await button('Publish listing').click();
    await counts(7, 2);
    await page.goto(`${baseURL}/stock`);
    await expect(page.locator('.stock-grid .car-card')).toHaveCount(6);
    await page.locator('.stock-tabs button').filter({ hasText: /^Sold/ }).click();
    await expect(page.locator('.stock-grid .car-card')).toHaveCount(2);
    await page.goto(`${baseURL}/stock-manager`);
    await reset();
  });

  for (const width of [360, 390, 768]) {
    await check(`Stock manager has no horizontal overflow at ${width}px`, async () => {
      await page.setViewportSize({ width, height: width === 768 ? 1024 : 844 });
      await reset();
      await noOverflow();
      await screenshot(`stock-manager-${width}.png`);
      await exampleDraft();
      await noOverflow();
      await screenshot(`stock-manager-review-${width}.png`);
      await button('Publish listing').click();
      await counts(7, 2);
      await noOverflow();
    });
  }

  await check('The concept makes no real mutation requests', async () => {
    expect(mutationRequests).toEqual([]);
  });
  await check('Stock manager has no browser runtime errors', async () => {
    expect(runtimeErrors).toEqual([]);
  });
} finally {
  await writeFile(resolve(screenshotDir, 'stock-manager-results.json'), JSON.stringify({ baseURL, results, runtimeErrors, mutationRequests }, null, 2));
  await browser.close();
}

const failed = results.filter(result => !result.passed);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
