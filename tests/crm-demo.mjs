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
const mutationRequests = [];
const results = [];
page.on('pageerror', error => runtimeErrors.push(error.message));
page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
page.on('request', request => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) {
    mutationRequests.push({ method: request.method(), url: request.url() });
  }
});

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

const button = name => page.getByRole('button', { name, exact: true });
const detail = () => page.getByTestId('crm-lead-detail');
const rows = () => page.getByTestId('crm-lead-row');
const row = id => page.locator(`[data-testid="crm-lead-row"][data-lead-id="${id}"]`);
const column = stage => page.locator(`[data-testid="crm-pipeline-column"][data-stage="${stage}"]`);
const card = id => page.locator(`[data-testid="crm-pipeline-card"][data-lead-id="${id}"]`);
const total = count => expect(page.getByTestId('crm-total-leads')).toHaveText(String(count));
async function reset() {
  const customerDialog = page.getByRole('dialog', { name: 'Customer details', exact: true });
  if (await customerDialog.count()) {
    await customerDialog.getByRole('button', { name: 'Close customer details', exact: true }).click();
  }
  await button('Reset demo').click();
}
const open = name => button(`Open ${name}`).click();
const screenshot = name => page.screenshot({ path: resolve(screenshotDir, name), fullPage: true });
let originalFollowUpDate = '';
let originalFollowUpTime = '';
const comment = 'Asked about finance and a trade-in inspection before Saturday.';

async function noOverflow() {
  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
}

async function addExampleLead() {
  await button('Add lead').click();
  const dialog = page.getByRole('dialog', { name: 'New customer enquiry', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Customer name', { exact: true }).fill('Zoe Adams');
  await dialog.getByLabel('Phone number', { exact: true }).fill('0400000000');
  await dialog.getByLabel('Email address', { exact: true }).fill('zoe@example.com');
  await dialog.getByLabel('Vehicle interest', { exact: true }).selectOption('hsv-gts-2016');
  await dialog.getByLabel('Lead source', { exact: true }).selectOption('Referral');
  await dialog.getByLabel('Trade-in vehicle', { exact: true }).fill('2015 Mazda 3');
  await dialog.getByLabel('Initial comment', { exact: true }).fill('Looking to trade up into a GTS.');
  await dialog.getByRole('button', { name: 'Save lead', exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

try {
  await page.goto(`${baseURL}/crm`);
  await check('The automotive CRM opens with sample customers and vehicle context', async () => {
    await expect(page.getByText('Interactive mockup', { exact: true })).toBeVisible();
    await total(8);
    await expect(rows()).toHaveCount(8);
    await expect(row('lead-1')).toContainText('James Wilson');
    await expect(row('lead-1')).toContainText('GTS');
    await expect(detail()).toContainText('Sarah Mitchell');
    await expect(detail()).toContainText('Clubsport');
    await expect(detail().getByLabel('Customer stage', { exact: true })).toHaveValue('test-drive');
    originalFollowUpDate = await detail().getByLabel('Follow-up date', { exact: true }).inputValue();
    originalFollowUpTime = await detail().getByLabel('Follow-up time', { exact: true }).inputValue();
    await noOverflow();
    await screenshot('crm-desktop.png');
  });

  await check('Selecting a customer changes their vehicle and sales context', async () => {
    await reset();
    await open('James Wilson');
    await expect(detail()).toContainText('James Wilson');
    await expect(detail()).toContainText('GTS');
    await expect(detail().getByLabel('Customer stage', { exact: true })).toHaveValue('new');
    await open('Michael Chen');
    await expect(detail()).toContainText('Michael Chen');
    await expect(detail()).toContainText('Mustang');
    await expect(detail().getByLabel('Customer stage', { exact: true })).toHaveValue('negotiating');
  });

  await check('Changing a stage updates the customer list, detail and pipeline together', async () => {
    await reset();
    await open('James Wilson');
    await detail().getByLabel('Customer stage', { exact: true }).selectOption('contacted');
    await expect(row('lead-1').getByLabel('Stage for James Wilson', { exact: true })).toHaveValue('contacted');
    await button('Pipeline').click();
    await expect(column('contacted').locator('[data-lead-id="lead-1"]')).toHaveCount(1);
    await expect(column('new').locator('[data-lead-id="lead-1"]')).toHaveCount(0);
    await button('Customers').click();
    await expect(detail().getByLabel('Customer stage', { exact: true })).toHaveValue('contacted');
    await total(8);
  });

  await check('The inline list stage control also updates the selected customer', async () => {
    await reset();
    await open('James Wilson');
    await row('lead-1').getByLabel('Stage for James Wilson', { exact: true }).selectOption('test-drive');
    await expect(detail().getByLabel('Customer stage', { exact: true })).toHaveValue('test-drive');
    await button('Pipeline').click();
    await expect(column('test-drive').locator('[data-lead-id="lead-1"]')).toHaveCount(1);
    await expect(column('new').locator('[data-lead-id="lead-1"]')).toHaveCount(0);
  });

  await check('Comments are saved to the correct customer when switching between leads', async () => {
    await reset();
    await open('Sarah Mitchell');
    await detail().getByLabel('Add a comment', { exact: true }).fill(comment);
    await detail().getByRole('button', { name: 'Add comment', exact: true }).click();
    await expect(detail()).toContainText(comment);
    await expect(detail().getByLabel('Add a comment', { exact: true })).toHaveValue('');
    await open('James Wilson');
    await expect(detail()).not.toContainText(comment);
    await open('Sarah Mitchell');
    await expect(detail()).toContainText(comment);
    await screenshot('crm-customer-comment.png');
  });

  await check('A follow-up date and time remain attached to their customer', async () => {
    await reset();
    await open('Sarah Mitchell');
    await detail().getByLabel('Follow-up date', { exact: true }).fill('2026-10-15');
    await detail().getByLabel('Follow-up time', { exact: true }).fill('14:30');
    await detail().getByRole('button', { name: 'Save follow-up', exact: true }).click();
    await open('James Wilson');
    await open('Sarah Mitchell');
    await expect(detail().getByLabel('Follow-up date', { exact: true })).toHaveValue('2026-10-15');
    await expect(detail().getByLabel('Follow-up time', { exact: true })).toHaveValue('14:30');
    await total(8);
  });

  await check('Customer and vehicle search combines with stage filters and can be cleared', async () => {
    await reset();
    await page.getByLabel('Search customers', { exact: true }).fill('jAmEs');
    await expect(rows()).toHaveCount(1);
    await expect(row('lead-1')).toBeVisible();
    await page.getByLabel('Filter by stage', { exact: true }).selectOption('contacted');
    await expect(rows()).toHaveCount(0);
    await button('Clear filters').click();
    await expect(rows()).toHaveCount(8);
    await page.getByLabel('Search customers', { exact: true }).fill('Clubsport');
    await expect(row('lead-3')).toBeVisible();
    await expect(row('lead-1')).toHaveCount(0);
    await button('Clear filters').click();
    await page.getByLabel('Filter by stage', { exact: true }).selectOption('new');
    await expect(rows()).toHaveCount(2);
    await expect(row('lead-1')).toBeVisible();
    await expect(row('lead-5')).toBeVisible();
    await total(8);
    await button('Clear filters').click();
    await expect(rows()).toHaveCount(8);
  });

  await check('The pipeline groups all customers by automotive sales stage', async () => {
    await reset();
    await button('Pipeline').click();
    await expect(page.getByTestId('crm-pipeline-column')).toHaveCount(7);
    await expect(page.getByTestId('crm-pipeline-card')).toHaveCount(8);
    await expect(column('new').getByTestId('crm-pipeline-card')).toHaveCount(2);
    await expect(column('test-drive').locator('[data-lead-id="lead-3"]')).toContainText('Sarah Mitchell');
    await expect(column('deposit').locator('[data-lead-id="lead-6"]')).toContainText('Andrew Lewis');
    await expect(column('delivered').locator('[data-lead-id="lead-7"]')).toContainText('Olivia Parker');
    await expect(column('lost').locator('[data-lead-id="lead-8"]')).toContainText('Ben Thompson');
    await card('lead-1').getByRole('button', { name: 'Open James Wilson', exact: true }).click();
    await expect(detail()).toContainText('James Wilson');
    await screenshot('crm-pipeline-desktop.png');
  });

  await check('Cancelling an unfinished customer enquiry leaves the demo unchanged', async () => {
    await reset();
    await button('Add lead').click();
    const dialog = page.getByRole('dialog', { name: 'New customer enquiry', exact: true });
    await dialog.getByLabel('Customer name', { exact: true }).fill('Unsaved customer');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await total(8);
    await expect(rows()).toHaveCount(8);
    await expect(page.getByText('Unsaved customer', { exact: true })).toHaveCount(0);
  });

  await check('Adding a customer links vehicle interest, trade-in, source and initial comment', async () => {
    await reset();
    await addExampleLead();
    await total(9);
    await expect(rows()).toHaveCount(9);
    await expect(row('lead-9')).toContainText('Zoe Adams');
    await expect(row('lead-9')).toContainText('GTS');
    await expect(detail()).toContainText('Zoe Adams');
    await expect(detail()).toContainText('0400000000');
    await expect(detail()).toContainText('zoe@example.com');
    await expect(detail()).toContainText('2015 Mazda 3');
    await expect(detail()).toContainText('Referral');
    await expect(detail()).toContainText('Looking to trade up into a GTS.');
    await expect(detail().getByLabel('Customer stage', { exact: true })).toHaveValue('new');
    await button('Pipeline').click();
    await expect(column('new').locator('[data-lead-id="lead-9"]')).toHaveCount(1);
  });

  await check('Reset restores the original customers, stages, notes and follow-up', async () => {
    await reset();
    await open('Sarah Mitchell');
    await detail().getByLabel('Customer stage', { exact: true }).selectOption('delivered');
    await detail().getByLabel('Add a comment', { exact: true }).fill(comment);
    await detail().getByRole('button', { name: 'Add comment', exact: true }).click();
    await detail().getByLabel('Follow-up date', { exact: true }).fill('2026-10-15');
    await detail().getByLabel('Follow-up time', { exact: true }).fill('14:30');
    await detail().getByRole('button', { name: 'Save follow-up', exact: true }).click();
    await addExampleLead();
    await reset();
    await total(8);
    await expect(rows()).toHaveCount(8);
    await expect(row('lead-9')).toHaveCount(0);
    await expect(row('lead-3').getByLabel('Stage for Sarah Mitchell', { exact: true })).toHaveValue('test-drive');
    await expect(detail()).toContainText('Sarah Mitchell');
    await expect(detail()).not.toContainText(comment);
    await expect(detail().getByLabel('Follow-up date', { exact: true })).toHaveValue(originalFollowUpDate);
    await expect(detail().getByLabel('Follow-up time', { exact: true })).toHaveValue(originalFollowUpTime);
  });

  await check('CRM edits do not change the public website inventory', async () => {
    await addExampleLead();
    await page.goto(`${baseURL}/stock`);
    await expect(page.locator('.stock-grid .car-card')).toHaveCount(6);
    await page.locator('.stock-tabs button').filter({ hasText: /^Sold/ }).click();
    await expect(page.locator('.stock-grid .car-card')).toHaveCount(2);
    await page.goto(`${baseURL}/crm`);
    await total(8);
  });

  for (const width of [360, 390, 768]) {
    await check(`Customers, detail, pipeline and add enquiry fit a ${width}px viewport`, async () => {
      await page.setViewportSize({ width, height: width === 768 ? 1024 : 844 });
      await reset();
      await noOverflow();
      await open('James Wilson');
      await expect(detail()).toContainText('James Wilson');
      await noOverflow();
      await screenshot(`crm-${width}.png`);
      await button('Close customer details').click();
      await button('Pipeline').click();
      await expect(card('lead-1')).toBeVisible();
      await noOverflow();
      await screenshot(`crm-pipeline-${width}.png`);
      await button('Add lead').click();
      await expect(page.getByRole('dialog', { name: 'New customer enquiry', exact: true })).toBeVisible();
      await noOverflow();
      await screenshot(`crm-add-lead-${width}.png`);
      await button('Cancel').click();
      await total(8);
    });
  }

  await check('The mockup makes no real mutation requests', async () => {
    expect(mutationRequests).toEqual([]);
  });
  await check('The CRM has no browser runtime errors', async () => {
    expect(runtimeErrors).toEqual([]);
  });
} finally {
  await writeFile(resolve(screenshotDir, 'crm-results.json'), JSON.stringify({ baseURL, results, runtimeErrors, mutationRequests }, null, 2));
  await browser.close();
}

const failed = results.filter(result => !result.passed);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
