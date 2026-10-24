import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const baseURL = process.env.MM_BASE_URL || 'http://localhost:5173';
const firstVehicleRoute = '/stock/hsv-gts-2016';
const firstVehicleName = '2016 HSV GTS';
const soldVehicleRoute = '/stock/hsv-maloo-2012';
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
// The unknown-page check expects a real 404 where the host serves one (Vercel).
const expected404 = new Set(['/nope']);
page.on('console', message => {
  if (message.type() !== 'error') return;
  const { url } = message.location();
  if (/status of 404/.test(message.text()) && url && expected404.has(new URL(url).pathname)) return;
  runtimeErrors.push(message.text());
});
const mutationRequests = [];
// The contact map is Google's embed; its own calls from inside its frame
// aren't requests the site makes.
const fromMap = request => {
  try {
    return /^https:\/\/(www|maps)\.google\.[a-z.]+\/maps\b/.test(request.frame().url());
  } catch {
    return false;
  }
};
page.on('request', request => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()) && !fromMap(request)) {
    mutationRequests.push({ method: request.method(), url: request.url() });
  }
});
// The tests never email the dealership, even against the live site: on the
// main page the enquiry API always says email is off, and a send is blocked
// (and caught by the guard above). The emailed flow has its own page below.
const enquiryOff = route => (route.request().method() === 'GET' ? route.fulfill({ json: { ok: true, email: false } }) : route.abort());
await page.route('**/api/enquiry', enquiryOff);
const results = [];
async function check(name, work) {
  try { await work(); results.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, passed: false, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
}
const cards = () => page.locator('.collection-grid .car-card');
const status = value => page.locator('.collection-tabs button').filter({ hasText: new RegExp(`^${value}`) });
const reset = () => page.locator('.filter-reset').click();
const goStock = () => page.goto(`${baseURL}/stock`);
const screenshot = name => page.screenshot({ path: resolve(screenshotDir, name), fullPage: true });
const controlledListbox = async control => {
  const id = await control.getAttribute('aria-controls');
  expect(id).toBeTruthy();
  return page.locator(`[role="listbox"][id=${JSON.stringify(id)}]`);
};
async function expectSelectValue(control, value, label) {
  if (await control.evaluate(element => element.tagName === 'SELECT')) {
    await expect(control).toHaveValue(value);
  } else {
    await expect(control).toHaveAttribute('data-value', value);
    if (label) await expect(control).toContainText(label);
  }
}
async function chooseSelect(control, value) {
  if (await control.evaluate(element => element.tagName === 'SELECT')) {
    await control.selectOption(value);
    await expect(control).toHaveValue(value);
    return;
  }
  await control.click();
  const listbox = await controlledListbox(control);
  await expect(listbox).toBeVisible();
  const option = listbox.locator(`[role="option"][data-value=${JSON.stringify(value)}]`);
  const label = (await option.innerText()).trim();
  await option.click();
  await expectSelectValue(control, value, label);
  await expect(control).toHaveAttribute('aria-expanded', 'false');
  await expect(listbox).toBeHidden();
}

try {
  await page.goto(baseURL);
  await check('MM Prestige branding and Wingfield contact details', async () => {
    await expect(page.locator('.header .brand')).toHaveAttribute('aria-label', /MM Prestige Motors home/i);
    await expect(page.locator('.footer')).toContainText('Grand Junction Road');
    await expect(page.locator('.footer')).toContainText('Wingfield SA 5013');
    const callLinks = page.locator('a[href^="tel:"]');
    expect(await callLinks.count()).toBeGreaterThan(0);
    for (const href of await callLinks.evaluateAll(links => links.map(link => link.getAttribute('href')))) {
      expect(href).toBe('tel:+61411710409');
    }
    await expect(page.locator('body')).toContainText('0411 710 409');
    const maps = page.locator('a[href*="google.com/maps"]').first();
    const mapURL = new URL(await maps.getAttribute('href'));
    expect(mapURL.searchParams.get('query')).toMatch(/MM Prestige Motors.*405A Grand Junction Road.*Wingfield.*5013/i);
    await expect(page.locator('body')).not.toContainText(/Impulse|Elizabeth South|0424 566 439|Philip Highway|Barry/);
    await expect(page.locator('a[href*="facebook.com"]')).toHaveCount(0);
  });
  await check('Black and red theme replaces previous palette preferences', async () => {
    await page.evaluate(() => localStorage.setItem('mm-theme', 'green'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'red');
    const theme = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return { background: style.getPropertyValue('--canvas').trim(), accent: style.getPropertyValue('--accent').trim() };
    });
    expect(theme).toEqual({ background: '#111111', accent: '#ed3545' });
    const button = await page.locator('.hero-search button[type="submit"]').evaluate(element => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, color: style.color };
    });
    expect(button).toEqual({ background: 'rgb(212, 37, 54)', color: 'rgb(255, 255, 255)' });
    await expect(page.locator('.palette-control')).toHaveCount(0);
  });
  await check('Sample listing details are clearly disclosed', async () => {
    await expect(page.locator('.sample-note')).toContainText('Sample listings');
    await expect(page.locator('.sample-note')).toContainText('prices and details are examples');
    await page.goto(`${baseURL}${firstVehicleRoute}`);
    await expect(page.locator('.vehicle-photo-note')).toContainText('Photographed at our Wingfield showroom');
    await expect(page.locator('.vehicle-photo-note')).toContainText('Price and details are samples');
    await expect(page.locator('.detail-note')).toContainText('sample data');
    await expect(page.locator('.vehicle-price-card')).toContainText('Sample price');
    await expect(page.locator('.finance p')).toContainText('not a finance offer');
    await page.goto(baseURL);
  });
  await check('CRM and stock-manager concepts stay on their own routes', async () => {
    await expect(page.locator('a[href^="/crm"], a[href^="/stock-manager"]')).toHaveCount(0);
    await page.goto(`${baseURL}/crm`);
    await expect(page.locator('.crm-demo')).toBeVisible();
    await expect(page.locator('.header')).toHaveCount(0);
    await expect(page).toHaveTitle(/Sales CRM mockup/);
    await page.goto(`${baseURL}/stock-manager`);
    await expect(page.locator('.stock-manager')).toBeVisible();
    await expect(page.locator('.header')).toHaveCount(0);
    await expect(page).toHaveTitle(/Stock management demo/);
    await page.goto(baseURL);
  });
  await check('Themed hero dropdowns support keyboard selection, dependent models and dismissal', async () => {
    const make = page.getByRole('combobox', { name: 'Car make', exact: true });
    const model = page.getByRole('combobox', { name: 'Car model', exact: true });
    expect(await make.evaluate(element => element.tagName)).toBe('BUTTON');
    await make.focus();
    await page.keyboard.press('Enter');
    const makes = await controlledListbox(make);
    await expect(makes).toBeVisible();
    await expect(make).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    const hsv = makes.getByRole('option', { name: 'HSV', exact: true });
    const activeId = await hsv.getAttribute('id');
    expect(activeId).toBeTruthy();
    await expect(make).toHaveAttribute('aria-activedescendant', activeId);
    await page.keyboard.press('Enter');
    await expectSelectValue(make, 'HSV', 'HSV');
    await expect(makes).toBeHidden();
    await expect(make).toBeFocused();
    await model.click();
    const models = await controlledListbox(model);
    await expect(models.getByRole('option', { name: 'GTS', exact: true })).toBeVisible();
    await expect(models.getByRole('option', { name: '360 Modena', exact: true })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(models).toBeHidden();
    await expect(model).toHaveAttribute('aria-expanded', 'false');
    await expect(model).toBeFocused();
    await chooseSelect(model, 'GTS');
    await chooseSelect(make, 'Ferrari');
    await expectSelectValue(model, '', 'Any models');
    await model.click();
    await expect(models.getByRole('option', { name: '360 Modena', exact: true })).toBeVisible();
    await expect(models.getByRole('option', { name: 'GTS', exact: true })).toHaveCount(0);
    await page.getByRole('heading', { level: 1 }).click();
    await expect(models).toBeHidden();
    await expect(model).toHaveAttribute('aria-expanded', 'false');
    await page.goto(baseURL);
  });
  await check('Home hero search carries make, model and budget into matching stock', async () => {
    const search = page.getByRole('form', { name: 'Find a car' });
    await chooseSelect(search.getByRole('combobox', { name: 'Car make', exact: true }), 'HSV');
    await chooseSelect(search.getByRole('combobox', { name: 'Car model', exact: true }), 'GTS');
    await chooseSelect(search.getByRole('combobox', { name: 'Car budget', exact: true }), '100000');
    await search.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/\/stock\?/);
    const query = new URL(page.url()).searchParams;
    expect(query.get('make')).toBe('HSV');
    expect(query.get('model')).toBe('GTS');
    expect(query.get('max')).toBe('100000');
    await expect(cards()).toHaveCount(2);
    await expect(cards().first().locator('.card-title')).toHaveText('HSV GTS');
    await expect(cards().first().locator('.card-title')).toHaveAttribute('href', firstVehicleRoute);
    await expect(page.getByRole('textbox', { name: 'Search stock' })).toHaveValue('GTS');
    await expect(page.getByRole('checkbox', { name: /^HSV/ })).toBeChecked();
    await expectSelectValue(page.getByRole('combobox', { name: /^Maximum price/ }), '100000', '$100,000');
    await page.goto(baseURL);
  });
  await check('Home collection browses featured cars and switches stock availability', async () => {
    const tabs = page.getByRole('group', { name: 'Featured stock availability' });
    const featuredCards = page.locator('.featured .car-card');
    const previous = page.getByRole('button', { name: 'Previous featured cars', exact: true });
    const next = page.getByRole('button', { name: 'Next featured cars', exact: true });
    await expect(previous).toBeDisabled();
    await expect(next).toBeEnabled();
    await expect(featuredCards.first().locator('.card-title')).toHaveText('HSV GTS');
    await next.click();
    await expect(featuredCards).toHaveCount(4);
    await expect(featuredCards.first().locator('.card-title')).toHaveText('HSV Clubsport R8');
    await expect(previous).toBeEnabled();
    await previous.click();
    await expect(featuredCards.first().locator('.card-title')).toHaveText('HSV GTS');
    await expect(previous).toBeDisabled();
    await tabs.getByRole('button', { name: 'Sold cars', exact: true }).click();
    await expect(tabs.getByRole('button', { name: 'Sold cars', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(featuredCards).toHaveCount(1);
    await expect(page.locator('.featured .sold-tag')).toHaveCount(1);
    await expect(previous).toBeDisabled();
    await expect(next).toBeDisabled();
    await tabs.getByRole('button', { name: 'All cars', exact: true }).click();
    await expect(featuredCards).toHaveCount(4);
    await tabs.getByRole('button', { name: 'In stock', exact: true }).click();
    await expect(tabs.getByRole('button', { name: 'In stock', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(featuredCards).toHaveCount(4);
    await expect(page.locator('.featured .sold-tag')).toHaveCount(0);
  });
  await check('Supplied customer reviews link to Google', async () => {
    const reviews = page.locator('#reviews');
    await expect(reviews.locator('.review')).toHaveCount(3);
    await expect(reviews).toContainText('Well done Madi!');
    await expect(reviews).toContainText('Jackson');
    const link = reviews.getByRole('link', { name: /Read our reviews on Google/ });
    expect(new URL(await link.getAttribute('href')).hostname).toBe('www.google.com');
  });
  await check('The sell banner and Performance panel show the showroom photos from the dealership\'s phone', async () => {
    await expect(page.locator('.reference-sell > img')).toHaveAttribute('src', '/images/sell-showroom-overhead.jpg');
    await expect(page.locator('.reference-sell > img')).toHaveAttribute('alt', /wall sign/);
    await expect(page.locator('.reference-sell > small')).toHaveText('Pictured: inside our Wingfield showroom');
    await expect(page.locator('.offer-performance img')).toHaveAttribute('src', '/images/performance-ferrari-gts.jpg');
    await expect(page.locator('.offer-performance img')).toHaveAttribute('alt', /Ferrari 360.*Maloo.*GTS/);
    await expect(page.locator('.featured .stock-tag').first()).toHaveText('THE ICON');
    // The banner photo is upscaled, so big and sharp screens get a 3,200 px copy.
    await expect(page.locator('.reference-sell > img')).toHaveAttribute('srcset', /sell-showroom-overhead-3200\.webp\S* 3200w/);
  });
  await check('Next up shows the showroom line-up, and the call tile says Contact us without a portrait', async () => {
    await expect(page.locator('.offer-trade img')).toHaveAttribute('src', '/images/tour-lineup.jpg');
    await expect(page.locator('.offer-trade')).toContainText("Let’s talk cars");
    await expect(page.locator('.offer-call-label')).toHaveText('Contact us');
    await expect(page.locator('.offer-call img')).toHaveCount(0);
    await expect(page.locator('.offer-call')).toHaveAttribute('href', 'tel:+61411710409');
    // The site speaks as "us"; only customers' own reviews name Madi.
    expect(await page.evaluate(() => {
      const main = document.querySelector('main').cloneNode(true);
      main.querySelectorAll('#reviews').forEach(node => node.remove());
      return main.textContent.includes('Madi');
    })).toBe(false);
  });
  await check('Finance and trade-ins are up front, and the Finance link leads to the finance section', async () => {
    const offer = page.locator('.offer-copy ol');
    await expect(offer).toContainText('Finance available');
    await expect(offer).toContainText('Trade-ins welcome');
    await expect(page.locator('.offer-trade p')).toHaveText('Buy. Sell. Trade. Finance.');
    await expect(page.locator('.reference-sell p')).toContainText('take trade-ins');
    // The finance panel sits under the sell banner, before the showroom tour.
    expect(await page.evaluate(() =>
      [...document.querySelectorAll('.reference-sell, #finance, #about')].map(el => el.id || 'sell').join(' '),
    )).toBe('sell finance about');
    const finance = page.locator('#finance');
    await expect(finance.getByRole('heading', { level: 2 })).toHaveText(/Finance\s*available\./i);
    await expect(finance.locator('.finance-steps li')).toHaveCount(3);
    await expect(finance.locator('.fan-badge')).toHaveText(/Trade-ins\s*welcome/);
    expect(await finance.locator('.fan-card').evaluateAll(cards => cards.map(card => new URL(card.getAttribute('src'), location.href).pathname))).toEqual([
      '/images/finance-black.jpg', '/images/finance-red.jpg', '/images/finance-silver.jpg',
    ]);
    await expect(finance.getByRole('link', { name: '0411 710 409' })).toHaveAttribute('href', 'tel:+61411710409');
    await page.locator('.nav').getByRole('link', { name: 'Finance', exact: true }).click();
    await expect(page).toHaveURL(/\/#finance$/);
    await expect.poll(async () => {
      const { y } = await page.locator('#finance').boundingBox();
      return y >= 0 && y < 200;
    }).toBe(true);
    await page.locator('#finance').getByRole('button', { name: /Apply for finance/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Apply for finance with MM Prestige Motors' });
    await expect(dialog.getByLabel("Car you'd like to finance")).toHaveValue('');
    expect(await dialog.locator('#finance-cars option').count()).toBeGreaterThan(0);
    // Nothing is sent from the form until email is set up: it prepares the message.
    await expect(dialog.getByRole('button', { name: 'Prepare enquiry' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
  await check('The email sits beside the phone, and the footer links our email, Instagram and TikTok', async () => {
    const pills = page.locator('.reference-contact .contact-pills');
    await expect(pills.getByRole('link', { name: '0411 710 409' })).toHaveAttribute('href', 'tel:+61411710409');
    await expect(pills.getByRole('link', { name: 'mmprestigemotors@gmail.com' })).toHaveAttribute('href', 'mailto:mmprestigemotors@gmail.com');
    const footer = page.locator('.footer');
    await expect(footer.getByRole('link', { name: 'mmprestigemotors@gmail.com' })).toHaveAttribute('href', 'mailto:mmprestigemotors@gmail.com');
    for (const social of [page.locator('.reference-contact .social-links'), footer.locator('.social-links')]) {
      const tiktok = social.getByRole('link', { name: 'TikTok' });
      await expect(tiktok).toHaveAttribute('href', 'https://www.tiktok.com/@mmprestigemotors');
      await expect(tiktok).toHaveAttribute('target', '_blank');
      await expect(social.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/mmprestigemotors/');
      for (const href of await social.locator('a').evaluateAll(links => links.map(link => link.href))) expect(href).toMatch(/^https:\/\//);
    }
  });
  await check('Meet Madi is gone, and About us leads to the showroom tour', async () => {
    await expect(page.locator('.meet-madi')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('Meet Madi');
    await expect(page.locator('.footer').getByRole('link', { name: 'Our story', exact: true })).toHaveAttribute('href', '/#about');
    await page.locator('.nav').getByRole('link', { name: 'About us', exact: true }).click();
    await expect(page).toHaveURL(/\/#about$/);
    await expect(page.locator('#about').getByRole('heading', { level: 2 })).toHaveText(/Take a look around/i);
    await expect.poll(async () => {
      const { y } = await page.locator('#about').boundingBox();
      return y >= 0 && y < 200;
    }).toBe(true);
  });
  await check('The showroom tour walks from the street to the line-up, with a gallery and a viewing enquiry', async () => {
    await page.goto(baseURL);
    const tour = page.locator('#about');
    // It sits where Meet Madi was: after the sell banner, before the reviews.
    expect(await page.evaluate(() => {
      const order = [...document.querySelectorAll('.reference-sell, #about, #reviews')].map(el => el.id || 'sell');
      return order.join(' ');
    })).toBe('sell about reviews');
    const photos = tour.locator('.tour-strip img');
    expect(await photos.evaluateAll(list => list.map(img => img.getAttribute('src')))).toEqual(['/images/tour-street.jpg', '/images/tour-door.jpg', '/images/tour-floor.jpg', '/images/tour-yellow.jpg', '/images/tour-lineup.jpg']);
    expect(await photos.evaluateAll(list => list.every(img => img.alt.length > 30 && img.srcset.includes('.webp') && img.width && img.height))).toBe(true);
    await expect(tour.locator('.tour-caption b')).toHaveText(['Out front', 'Through the door', 'Inside', 'Up close', 'The line-up']);
    await expect(tour.locator('.tour-count')).toHaveText('01 / 05');
    await expect(tour.getByRole('button', { name: 'Previous showroom photo' })).toHaveAttribute('aria-disabled', 'true');
    const next = tour.getByRole('button', { name: 'Next showroom photo' });
    await next.click();
    await expect(tour.locator('.tour-count')).toHaveText('02 / 05');
    for (let i = 0; i < 6 && (await next.getAttribute('aria-disabled')) !== 'true'; i++) {
      await next.click();
      await page.waitForTimeout(700);
    }
    await expect(next).toHaveAttribute('aria-disabled', 'true');
    await expect(tour.locator('.tour-count')).toHaveText('05 / 05');
    // The whole line-up shows at the end of the strip.
    const strip = await tour.locator('.tour-strip').boundingBox();
    const last = await tour.locator('.tour-photo').last().boundingBox();
    expect(last.x + last.width).toBeLessThanOrEqual(strip.x + strip.width + 1);
    // Each photo opens large; the arrow keys step through and Escape closes.
    await tour.locator('.tour-photo').nth(1).click();
    const gallery = page.getByRole('dialog', { name: 'Showroom photos' });
    await expect(gallery).toBeVisible();
    await expect(gallery.locator('img')).toHaveAttribute('src', '/images/tour-door.jpg');
    await page.keyboard.press('ArrowRight');
    await expect(gallery.locator('img')).toHaveAttribute('src', '/images/tour-floor.jpg');
    await expect(gallery.locator('p')).toHaveText('Inside: The showroom floor');
    await page.keyboard.press('Escape');
    await expect(gallery).toHaveCount(0);
    await expect(tour.getByRole('link', { name: 'Browse our stock' })).toHaveAttribute('href', '/stock');
    await tour.getByRole('button', { name: /Book a viewing/ }).click();
    const enquiry = page.getByRole('dialog', { name: 'Enquire with MM Prestige Motors' });
    await expect(enquiry).toBeVisible();
    await expect(enquiry.locator('textarea').first()).toHaveValue(/see the cars.*viewing at the Wingfield showroom/);
    await page.keyboard.press('Escape');
    await expect(enquiry).toHaveCount(0);
  });
  await check('The contact section shows a satellite Google map of the showroom that nothing covers', async () => {
    const map = page.locator('#visit .contact-map iframe');
    await expect(map).toHaveCount(1);
    const src = new URL(await map.getAttribute('src'));
    expect(src.hostname).toBe('maps.google.com');
    expect(src.searchParams.get('t')).toBe('k');
    expect(src.searchParams.get('output')).toBe('embed');
    expect(src.searchParams.get('q')).toBe('Unit 4/405A Grand Junction Road, Wingfield SA 5013');
    await expect(map).toHaveAttribute('title', /Satellite map of MM Prestige Motors/);
    await expect(page.locator('#visit img')).toHaveCount(0);
    // The map takes drags and zooms: the frame itself is what's under its centre.
    await map.scrollIntoViewIfNeeded();
    await expect.poll(() => map.evaluate(frame => {
      const box = frame.getBoundingClientRect();
      return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === frame;
    })).toBe(true);
    await expect(page.locator('#visit .location-address')).toContainText('Unit 4/405A Grand Junction Road');
    await expect(page.locator('#visit').getByRole('link', { name: /Get directions/ })).toHaveAttribute('href', /google\.com\/maps/);
  });
  await check('Specialties marquee hides its repeat from screen readers and the header floats once scrolled', async () => {
    await expect(page.locator('.marque-words[aria-label]')).toHaveCount(1);
    await expect(page.locator('.marque-copy')).toHaveAttribute('aria-hidden', 'true');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('.header')).not.toHaveClass(/is-compact/);
    await page.evaluate(() => window.scrollTo(0, 700));
    await expect(page.locator('.header')).toHaveClass(/is-compact/);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('.header')).not.toHaveClass(/is-compact/);
  });
  await check('A muted showroom film plays behind the home hero and can be paused', async () => {
    await page.goto(baseURL);
    const film = page.locator('.reference-hero video.hero-film');
    await expect(film).toHaveCount(1, { timeout: 10000 });
    // AV1, then HEVC, then H.264 for older browsers. Desktops get the 1920 px cut.
    await expect(film.locator('source')).toHaveCount(3);
    const sources = await film.locator('source').evaluateAll(list => list.map(source => source.getAttribute('src')));
    // Each URL carries the films' version, so browsers drop cached copies after a re-encode.
    expect(sources.every(src => /\?v=\d+$/.test(src))).toBe(true);
    expect(sources.map(src => src.replace(/\?v=\d+$/, ''))).toEqual(['/video/showroom-walk-1920.av1.mp4', '/video/showroom-walk-1920.hevc.mp4', '/video/showroom-walk-1280.mp4']);
    for (const src of sources) {
      const response = await page.request.head(`${baseURL}${src}`);
      expect(response.ok(), src).toBe(true);
    }
    expect(await film.evaluate(video => video.muted && video.loop && video.playsInline)).toBe(true);
    // The film and the photo have the grade built in, so CSS must not grade either.
    expect(await film.evaluate(video => getComputedStyle(video).filter)).toBe('none');
    expect(await page.locator('.reference-hero img.reference-hero-image').evaluate(image => getComputedStyle(image).filter)).toBe('none');
    // The hero photo stays underneath as the fallback.
    await expect(page.locator('.reference-hero img.reference-hero-image')).toHaveAttribute('src', '/images/showroom-lineup.jpg');
    const playable = await film.evaluate(video => [...video.querySelectorAll('source')].some(source => video.canPlayType(source.type)));
    if (!playable) return;
    await expect(film).toHaveClass(/is-playing/, { timeout: 15000 });
    await page.getByRole('button', { name: 'Pause the showroom video' }).click();
    await expect(film).not.toHaveClass(/is-playing/);
    expect(await film.evaluate(video => video.paused)).toBe(true);
    await expect(page.locator('html')).toHaveAttribute('data-motion-paused', '');
    await page.getByRole('button', { name: 'Play the showroom video' }).click();
    await expect(film).toHaveClass(/is-playing/);
    await expect(page.locator('html')).not.toHaveAttribute('data-motion-paused', '');
  });
  await check('Sell-your-car form prepares a trade-in message with the car details', async () => {
    await page.locator('.header-actions').getByRole('button', { name: 'Sell your car', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Sell or trade your car with MM Prestige Motors' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Year').fill('2015');
    await dialog.getByLabel('Kilometres').fill('85,000');
    await dialog.getByLabel('Make').fill('Holden');
    await dialog.getByLabel('Model').fill('Commodore SS');
    await dialog.getByLabel('Condition').selectOption('Good');
    await dialog.getByLabel('What would you like to do?').selectOption('Trade it in');
    await dialog.getByLabel('Full name').fill('Website QA');
    await dialog.getByLabel('Phone number').fill('0400000000');
    await dialog.getByRole('button', { name: 'Prepare enquiry' }).click();
    const message = decodeURIComponent((await dialog.getByRole('link', { name: 'Send via SMS' }).getAttribute('href')).split('?body=')[1]);
    expect(message).toContain("Hi, I'd like to trade in my car.");
    expect(message).toContain('Car: 2015 Holden Commodore SS');
    expect(message).toContain('Kilometres: 85,000');
    expect(message).toContain('Condition: Good');
    expect(message).not.toContain('Rego:');
    expect(message).toContain('Name: Website QA');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
  await check('Header shows our number and every link on desktop', async () => {
    await expect(page.locator('.header-call')).toHaveAttribute('href', 'tel:+61411710409');
    await expect(page.locator('.header-call')).toContainText('0411 710 409');
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeHidden();
    await expect(page.locator('.nav').getByRole('link', { name: 'Sold cars', exact: true })).toBeVisible();
    await expect(page.locator('.header-saved')).toHaveCount(0);
  });
  await check('Home page carries link-preview tags and dealer details for search', async () => {
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og-image\.png$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/$/);
    const dealer = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    expect(dealer['@type']).toBe('AutoDealer');
    expect(dealer.telephone).toBe('+61411710409');
    expect(dealer.address.postalCode).toBe('5013');
  });
  await check('Home page and stock links', async () => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('HSV & Holden specialists');
    await expect(page).toHaveTitle(/MM Prestige Motors/);
    await expect(page.locator('.featured .car-card')).toHaveCount(4);
    await page.getByRole('link', { name: 'Explore our stock', exact: true }).click();
    await expect(page).toHaveURL(/\/stock$/);
    await expect(cards()).toHaveCount(5);
  });
  await check('Available, sold and all stock', async () => {
    // Switching tabs keeps the visitor's place on the page.
    await page.evaluate(() => window.scrollTo(0, 650));
    // Dispatched so the test doesn't scroll the tab into view first.
    await status('Sold').dispatchEvent('click');
    await expect(page).toHaveURL(/status=sold/);
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(650);
    await status('In stock').click();
    await status('Sold').click();
    await expect(cards()).toHaveCount(1);
    await expect(page.locator('.collection-grid .sold-tag')).toHaveCount(1);
    await status('All cars').click();
    await expect(cards()).toHaveCount(6);
    await status('In stock').click();
    await expect(cards()).toHaveCount(5);
  });
  await check('Search and reset', async () => {
    await page.getByRole('textbox', { name: 'Search stock' }).fill('Clubsport');
    await expect(cards()).toHaveCount(1);
    await expect(cards().first()).toContainText('Clubsport R8');
    await page.getByRole('textbox', { name: 'Search stock' }).fill('no-such-car');
    await expect(cards()).toHaveCount(0);
    await expect(page.getByText('No cars in this lane.')).toBeVisible();
    await reset();
    await expect(cards()).toHaveCount(5);
  });
  await check('Make filter', async () => {
    await page.getByRole('checkbox', { name: /^HSV/ }).check();
    await expect(cards()).toHaveCount(4);
    for (const text of await cards().allTextContents()) expect(text).toContain('HSV');
    await reset();
  });
  await check('Transmission and maximum price filters', async () => {
    await chooseSelect(page.getByRole('combobox', { name: /^Transmission/ }), 'Manual');
    await expect(cards()).toHaveCount(2);
    await chooseSelect(page.getByRole('combobox', { name: /^Maximum price/ }), '60000');
    await expect(cards()).toHaveCount(1);
    await expect(cards().first()).toContainText('Clubsport R8');
    await reset();
  });
  await check('Body style filter', async () => {
    await page.getByLabel('Ute', { exact: true }).check();
    await expect(cards()).toHaveCount(1);
    await page.getByRole('button', { name: 'All body styles', exact: true }).click();
    await expect(cards()).toHaveCount(5);
  });
  await check('Sorting by price and kilometres', async () => {
    await chooseSelect(page.getByRole('combobox', { name: 'Sort stock', exact: true }), 'price-low');
    const prices = await page.locator('.collection-grid .card-bottom strong').allTextContents();
    expect(prices.map(s => +s.replace(/\D/g, ''))).toEqual([49990, 54990, 67990, 94990, 149990]);
    await chooseSelect(page.getByRole('combobox', { name: 'Sort stock', exact: true }), 'price-high');
    await expect(cards().first()).toContainText('Ferrari');
    await chooseSelect(page.getByRole('combobox', { name: 'Sort stock', exact: true }), 'kms');
    await expect(cards().first().locator('.card-title')).toHaveText('Ferrari 360 Modena');
    await chooseSelect(page.getByRole('combobox', { name: 'Sort stock', exact: true }), 'newest');
  });
  await check('Save a car and persist saved state', async () => {
    // Save the second car, so the first car's listing starts unsaved later on.
    await cards().nth(1).getByRole('button', { name: /^Save / }).click();
    await expect(cards().nth(1).getByRole('button', { name: /^Unsave / })).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await page.locator('.saved-toggle').click();
    await expect(cards()).toHaveCount(1);
    await expect(cards().first().locator('.card-title')).toHaveText('HSV Maloo R8');
    await page.locator('.saved-toggle').click();
    await expect(cards()).toHaveCount(5);
  });
  await check('Header saved-cars link opens the saved view', async () => {
    const link = page.locator('.header-saved');
    await expect(link).toHaveAttribute('aria-label', 'Saved cars (1)');
    await page.goto(`${baseURL}/stock/hsv-gts-2016`);
    await link.click();
    await expect(page).toHaveURL(/\/stock\?status=all$/);
    await expect(page.locator('.saved-toggle')).toHaveAttribute('aria-pressed', 'true');
    await expect(cards()).toHaveCount(1);
    await expect(cards().first().locator('.card-variant')).toHaveText('2014 Gen-F · V8 ute');
  });
  await check('Stock car finder prepares a wanted-car message', async () => {
    await goStock();
    await page.getByRole('button', { name: /Find me a car/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Find a car with MM Prestige Motors' });
    await dialog.getByLabel('Make and model').fill('HSV GTS');
    await dialog.getByLabel(/^Budget/).selectOption('Over $100,000');
    await dialog.getByLabel('Full name').fill('Website QA');
    await dialog.getByLabel('Phone number').fill('0400000000');
    await dialog.getByRole('button', { name: 'Prepare enquiry' }).click();
    await expect(dialog.locator('.message-preview')).toContainText('Looking for: HSV GTS');
    await expect(dialog.locator('.message-preview')).toContainText('Budget: Over $100,000');
    await expect(dialog.locator('.message-preview')).not.toContainText('Years:');
    await page.keyboard.press('Escape');
  });
  await check('A car photo morphs into its listing and Back returns to the same place', async () => {
    await goStock();
    // Record which photos carry a view-transition name as each transition starts.
    await page.evaluate(() => {
      window.morphs = [];
      const start = document.startViewTransition?.bind(document);
      if (start) document.startViewTransition = update => {
        window.morphs.push([...document.images].map(image => image.style.viewTransitionName).filter(Boolean));
        return start(update);
      };
    });
    const card = cards().nth(4);
    await card.scrollIntoViewIfNeeded();
    const y = await page.evaluate(() => Math.round(window.scrollY));
    expect(y).toBeGreaterThan(300);
    // A plain mouse click, so the test doesn't scroll the page first.
    const box = await card.locator('.card-photo').boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page).toHaveURL(/\/stock\/[^/]+$/);
    if (await page.evaluate(() => typeof document.startViewTransition === 'function'))
      expect(await page.evaluate(() => window.morphs[0])).toEqual(['car-photo']);
    await expect.poll(() => page.locator('.vehicle-stage-image').evaluate(image => image.style.viewTransitionName)).toBe('');
    await page.goBack();
    await expect(page).toHaveURL(/\/stock$/);
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(y);
  });
  await check('Photos are served as resized WebP files', async () => {
    const card = cards().first().locator('img');
    // Each copy's URL carries a hash of the file, so a changed photo is fetched again.
    await expect(card).toHaveAttribute('srcset', /\/images\/opt\/.+\.webp\?v=[0-9a-f]{8} \d+w/);
    await page.waitForFunction(() => /\.webp(\?|$)/.test(document.querySelector('.collection-grid img')?.currentSrc || ''));
    await page.goto(`${baseURL}${firstVehicleRoute}`);
    // Full-frame photos go up to 3200 px for large high-density screens.
    await expect(page.locator('.vehicle-stage-image')).toHaveAttribute('srcset', /hsv-gts-genf-front-2400\.webp\?v=[0-9a-f]{8} 2400w, \/images\/opt\/hsv-gts-genf-front-3200\.webp\?v=[0-9a-f]{8} 3200w/);
  });
  await check('Vehicle detail and carousel', async () => {
    await page.goto(`${baseURL}${firstVehicleRoute}`);
    const count = page.locator('.vehicle-hero-count');
    const photo = page.locator('.vehicle-stage-image');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('2016 HSV GTS');
    await expect(page.locator('.vehicle-price-card')).toContainText('$94,990');
    await expect(count).toHaveText('01 / 03');
    await expect(photo).toHaveAttribute('src', '/images/hsv-gts-genf-front.jpg');
    await expect(photo).toHaveAttribute('alt', 'HSV GTS photo 1 of 3');
    await page.getByRole('button', { name: 'Next vehicle photo', exact: true }).click();
    await expect(count).toHaveText('02 / 03');
    await expect(photo).toHaveAttribute('src', '/images/hsv-gts-genf-rear.jpg');
    await page.getByRole('button', { name: 'Previous vehicle photo', exact: true }).click();
    await expect(count).toHaveText('01 / 03');
    await page.getByRole('button', { name: 'Previous vehicle photo', exact: true }).click();
    await expect(count).toHaveText('03 / 03');
    await page.getByRole('button', { name: 'Show vehicle photo 1', exact: true }).click();
    await expect(count).toHaveText('01 / 03');
    await expect(page.getByRole('button', { name: 'Show vehicle photo 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Show vehicle photo 2', exact: true })).toHaveAttribute('aria-pressed', 'false');
  });
  await check('Vehicle breadcrumb, save and share', async () => {
    const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(crumbs.getByRole('link', { name: 'Stock' })).toHaveAttribute('href', '/stock');
    await expect(crumbs.locator('[aria-current="page"]')).toHaveText('HSV GTS');
    const save = page.locator('.vehicle-actions').getByRole('button', { name: 'Save vehicle' });
    await save.click();
    const unsave = page.locator('.vehicle-actions').getByRole('button', { name: 'Unsave vehicle' });
    await expect(unsave).toHaveAttribute('aria-pressed', 'true');
    await expect(unsave).toContainText('Saved');
    await unsave.click();
    await expect(save).toHaveAttribute('aria-pressed', 'false');
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseURL });
    await page.locator('.vehicle-share').click();
    await expect(page.locator('.vehicle-share')).toContainText('Link copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${baseURL}${firstVehicleRoute}`);
  });
  await check('Expanded gallery, keyboard arrows and Escape', async () => {
    await page.getByRole('button', { name: 'Expand vehicle photos', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Vehicle photo gallery' })).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.lightbox-controls span')).toHaveText('2 / 3');
    await page.getByRole('button', { name: 'Previous expanded photo' }).click();
    await expect(page.locator('.lightbox-controls span')).toHaveText('1 / 3');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.lightbox-controls span')).toHaveText('3 / 3');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
  await check('Overview highlights and specifications beside the photos', async () => {
    await expect(page.getByRole('heading', { level: 2, name: 'Australian muscle.' })).toBeVisible();
    await expect(page.locator('.vehicle-about p')).toContainText('supercharged V8');
    await expect(page.locator('.vehicle-facts li')).toHaveCount(4);
    await expect(page.locator('#specifications')).toBeVisible();
    await expect(page.locator('#specifications')).toContainText('430 kW');
    await expect(page.locator('#specifications')).toContainText('MM101');
    await expect(page.locator('#specifications')).toContainText('Wingfield, SA');
  });
  await check('Apply for finance opens the finance form with the car filled in', async () => {
    await page.getByRole('button', { name: /Apply for finance/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Apply for finance with MM Prestige Motors' });
    await expect(dialog.getByLabel("Car you'd like to finance")).toHaveValue('2016 HSV GTS');
    await expect(dialog.getByLabel('Email')).toHaveAttribute('required', '');
    await dialog.getByLabel('Full name').fill('Website QA');
    await dialog.getByLabel('Phone number').fill('0400000000');
    await dialog.getByLabel('Email').fill('qa@example.com');
    await dialog.getByRole('button', { name: 'Prepare enquiry' }).click();
    const email = new URL(await dialog.getByRole('link', { name: 'Send by email' }).getAttribute('href'));
    expect(email.protocol).toBe('mailto:');
    expect(email.pathname).toBe('mmprestigemotors@gmail.com');
    expect(email.searchParams.get('subject')).toBe('Finance enquiry: Website QA, 2016 HSV GTS');
    expect(email.searchParams.get('body')).toContain("Hi, I'd like to apply for finance.\n\nCar: 2016 HSV GTS");
    expect(email.searchParams.get('body')).toContain('Name: Website QA\nPhone: 0400000000\nEmail: qa@example.com');
    await page.keyboard.press('Escape');
  });
  await check('Repayment calculator updates at zero interest', async () => {
    await page.locator('.finance-toggle').click();
    await page.getByLabel('Deposit', { exact: true }).fill('20000');
    await chooseSelect(page.getByRole('combobox', { name: /^Term/ }), '3');
    await page.getByLabel('Annual interest rate').fill('0');
    const weekly = Math.round((94990 - 20000) / 36 * 12 / 52);
    await expect(page.locator('.finance-toggle b')).toHaveText(`$${weekly} / week`);
    await expect(page.locator('.finance p')).toContainText('3-year term, 0% p.a., $20,000 deposit');
  });
  await check('Enquiry preparation and SMS link', async () => {
    await page.getByRole('button', { name: 'Enquire about this car', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Enquire with MM Prestige Motors' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Full name').fill('Website QA');
    await dialog.getByLabel('Phone number').fill('0400000000');
    await expect(dialog.getByLabel('Your message')).toHaveValue(new RegExp(`Hi, I'm interested in the ${firstVehicleName}`));
    await dialog.getByRole('button', { name: 'Prepare enquiry' }).click();
    await expect(dialog.getByText('Your message is ready.')).toBeVisible();
    const href = await dialog.getByRole('link', { name: 'Send via SMS' }).getAttribute('href');
    expect(href.startsWith('sms:+61411710409?body=')).toBeTruthy();
    const message = decodeURIComponent(href.split('?body=')[1]);
    expect(message).toContain(firstVehicleName);
    expect(message).toContain('Name: Website QA');
    expect(message).toContain('Phone: 0400000000');
    expect(message).not.toContain('Email:');
    const email = await dialog.getByRole('link', { name: 'Send by email' }).getAttribute('href');
    expect(email.startsWith('mailto:mmprestigemotors@gmail.com?subject=')).toBeTruthy();
    await dialog.getByRole('button', { name: 'Edit your message' }).click();
    await expect(dialog.getByLabel('Full name')).toHaveValue('Website QA');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
  await check('Sold vehicle hides price, has one photo and offers similar cars', async () => {
    await page.goto(`${baseURL}${soldVehicleRoute}`);
    await expect(page.locator('.vehicle-sold')).toHaveText('SOLD');
    await expect(page.locator('.vehicle-hero-count')).toHaveText('01 / 01');
    await expect(page.getByRole('button', { name: 'Next vehicle photo', exact: true })).toHaveCount(0);
    await expect(page.locator('.finance')).toHaveCount(0);
    await expect(page.locator('#call-heading')).toHaveText('Talk to Us');
    await expect(page.locator('.vehicle-call img')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Find me something similar' })).toBeVisible();
    await page.getByRole('button', { name: 'Find me something similar' }).click();
    const dialog = page.getByRole('dialog', { name: 'Find a car with MM Prestige Motors' });
    await expect(dialog.getByLabel('Make and model')).toHaveValue('HSV Maloo or similar');
    await page.keyboard.press('Escape');
  });
  await check('Footer story link scrolls from stock to the showroom tour', async () => {
    await goStock();
    await page.locator('.footer').getByRole('link', { name: 'Our story', exact: true }).click();
    await expect(page).toHaveURL(/\/#about$/);
    await expect.poll(async () => {
      const { y } = await page.locator('#about').boundingBox();
      return y >= 0 && y < 200;
    }).toBe(true);
  });
  await check('Keyboard enquiry traps focus, shows focus and returns to its trigger', async () => {
    await page.goto(`${baseURL}${firstVehicleRoute}`);
    const trigger = page.getByRole('button', { name: 'Enquire about this car', exact: true });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Enquire with MM Prestige Motors' });
    const close = dialog.getByRole('button', { name: 'Close dialog', exact: true });
    await expect(close).toBeFocused();
    const outline = await close.evaluate(element => {
      const style = getComputedStyle(element);
      return { width: parseFloat(style.outlineWidth), style: style.outlineStyle };
    });
    expect(outline.width).toBeGreaterThan(0);
    expect(outline.style).not.toBe('none');
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('link', { name: /^Prefer to call\?/ })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
  await check('Reduced-motion preference disables smooth scrolling and makes image transitions instant', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(baseURL);
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBeTruthy();
    expect(await page.locator('html').evaluate(element => getComputedStyle(element).scrollBehavior)).toBe('auto');
    const motion = await page.locator('.featured .car-card img').first().evaluate(element => {
      const style = getComputedStyle(element);
      return { transition: style.transitionDuration, animation: style.animationName };
    });
    // A duration up to 0.1ms preserves transition events without visible motion.
    expect(motion.transition.split(',').every(duration => parseFloat(duration) <= 0.0001)).toBeTruthy();
    expect(motion.animation).toBe('none');
    // The hero keeps its photo: no film is loaded.
    await page.waitForTimeout(800);
    await expect(page.locator('video.hero-film')).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  });
  await page.goto(baseURL);
  await screenshot('home-desktop.png');
  await goStock();
  await screenshot('stock-desktop.png');
  await page.goto(`${baseURL}${firstVehicleRoute}`);
  await screenshot('vehicle-desktop.png');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL);
  await check('Mobile navigation opens, navigates and closes', async () => {
    const toggle = page.getByRole('button', { name: 'Open navigation' });
    await toggle.click();
    const close = page.getByRole('button', { name: 'Close navigation' });
    await expect(close).toHaveAttribute('aria-expanded', 'true');
    const controls = await close.getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    await expect(page.locator('.nav')).toHaveAttribute('id', controls);
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    await toggle.click();
    await page.locator('.nav').getByRole('link', { name: 'Inventory', exact: true }).click();
    await expect(page).toHaveURL(/\/stock$/);
    await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false');
  });
  await check('Phone header keeps a call button and lists saved cars in the menu', async () => {
    await expect(page.locator('.header-call')).toBeVisible();
    await expect(page.locator('.header-call')).toHaveAttribute('aria-label', 'Call us on 0411 710 409');
    await expect(page.locator('.header-saved')).toBeHidden();
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.locator('.nav').getByRole('link', { name: /Saved cars/ })).toHaveAttribute('href', '/stock?status=all&saved=1');
    await page.keyboard.press('Escape');
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
    await expect(page.locator('.collection-filters')).toHaveClass(/is-open/);
    await page.getByRole('checkbox', { name: /^Ferrari/ }).check();
    await page.getByRole('button', { name: 'Show 1 cars', exact: true }).click();
    await expect(page.locator('.collection-filters')).not.toHaveClass(/is-open/);
    await expect(cards()).toHaveCount(1);
    await page.getByRole('button', { name: /^Filters/ }).click();
    await reset();
    await page.getByRole('button', { name: 'Show 5 cars', exact: true }).click();
    await expect(cards()).toHaveCount(5);
  });
  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 844 });
    for (const [name, route] of [['home', '/'], ['stock', '/stock'], ['vehicle', firstVehicleRoute]]) {
      await check(`No horizontal overflow on ${name} at ${width}px`, async () => {
        await page.goto(`${baseURL}${route}`);
        await page.waitForTimeout(250);
        const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
        expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
        await screenshot(`${name}-${width}.png`);
      });
    }
  }
  await check('Phones keep the stock hero photo without a film', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await goStock();
    await page.waitForTimeout(1200);
    await expect(page.locator('video.hero-film')).toHaveCount(0);
  });
  const filmSources = film => film.locator('source').evaluateAll(list => list.map(source => source.getAttribute('src').replace(/\?v=\d+$/, '')));
  await check('Phones get the upright home film over its first frame, filling the hero', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(baseURL);
    // The photo swaps to the phone film's first frame and fills the hero.
    const photo = page.locator('.showroom-hero img.reference-hero-image');
    await expect.poll(() => photo.evaluate(image => image.currentSrc)).toContain('/images/opt/showroom-mobile-');
    // Layout sizes, so the photo's settle-in zoom doesn't count.
    const fit = await photo.evaluate(image => ({ top: image.offsetTop, height: image.offsetHeight, hero: image.closest('.showroom-hero').clientHeight }));
    expect(fit.top).toBe(0);
    expect(Math.abs(fit.height - fit.hero)).toBeLessThanOrEqual(1);
    const film = page.locator('.reference-hero video.hero-film');
    await expect(film).toHaveCount(1, { timeout: 10000 });
    // Standard screens get the 720 px cut.
    const sources = await filmSources(film);
    expect(sources).toEqual(['/video/showroom-mobile-720.av1.mp4', '/video/showroom-mobile-720.hevc.mp4', '/video/showroom-mobile-720.mp4']);
    for (const src of sources) {
      const response = await page.request.head(`${baseURL}${src}`);
      expect(response.ok(), src).toBe(true);
    }
  });
  await check('Sharp phone screens get the 1080 px upright film', async () => {
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true });
    try {
      const phonePage = await phone.newPage();
      await phonePage.goto(baseURL);
      const film = phonePage.locator('.reference-hero video.hero-film');
      await expect(film).toHaveCount(1, { timeout: 10000 });
      const sources = await filmSources(film);
      expect(sources).toEqual(['/video/showroom-mobile-1080.av1.mp4', '/video/showroom-mobile-1080.hevc.mp4', '/video/showroom-mobile-720.mp4']);
      for (const src of sources) {
        const response = await phonePage.request.head(`${baseURL}${src}`);
        expect(response.ok(), src).toBe(true);
      }
    } finally {
      await phone.close();
    }
  });
  await check('Phones stack the home title, search and map link without overlap', async () => {
    for (const width of [430, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(baseURL);
      const hero = page.locator('.reference-home .showroom-hero');
      await expect(hero.locator('.hero-footnote')).toBeHidden();
      const map = hero.locator('a.hero-map');
      await expect(map).toBeVisible();
      await expect(map).toHaveAttribute('href', /google\.com\/maps/);
      // Layout positions, so the arrival animations don't count.
      const layout = await hero.evaluate(section => {
        const box = element => {
          let top = 0;
          for (let node = element; node && node !== section; node = node.offsetParent) top += node.offsetTop;
          return { top, bottom: top + element.offsetHeight };
        };
        return {
          header: document.querySelector('.header').getBoundingClientRect().bottom - section.getBoundingClientRect().top,
          title: box(section.querySelector('h1')),
          search: box(section.querySelector('.hero-search')),
          map: box(section.querySelector('.hero-map')),
          height: section.clientHeight,
        };
      });
      expect(layout.title.top, `${width}px`).toBeGreaterThan(layout.header);
      expect(layout.title.bottom, `${width}px`).toBeLessThanOrEqual(layout.search.top);
      expect(layout.search.bottom, `${width}px`).toBeLessThanOrEqual(layout.map.top);
      expect(layout.map.bottom, `${width}px`).toBeLessThanOrEqual(layout.height);
    }
  });
  await check('Small tablets keep the walk-in film at 1280 px over the wide photo', async () => {
    await page.setViewportSize({ width: 680, height: 900 });
    await page.goto(baseURL);
    const film = page.locator('.reference-hero video.hero-film');
    await expect(film).toHaveCount(1, { timeout: 10000 });
    expect(await filmSources(film)).toEqual(['/video/showroom-walk-1280.av1.mp4', '/video/showroom-walk-1280.hevc.mp4', '/video/showroom-walk-1280.mp4']);
    await expect.poll(() => page.locator('.showroom-hero img.reference-hero-image').evaluate(image => image.currentSrc)).toContain('/images/opt/showroom-lineup-');
  });
  await check('Stock follows the home layout with four generous columns on a wide screen', async () => {
    await page.setViewportSize({ width: 2493, height: 1265 });
    // Measure the settled layout: with reduced motion the cards don't slide in.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    try {
      await goStock();
      const hero = await page.locator('.stock-hero').boundingBox();
      expect(hero.x).toBeLessThanOrEqual(20);
      expect(hero.width).toBeGreaterThan(2493 - 40);
      const first = await cards().nth(0).boundingBox();
      const fourth = await cards().nth(3).boundingBox();
      expect(first.width).toBeGreaterThan(350);
      expect(first.x).toBeLessThanOrEqual(2493 * 0.05);
      expect(fourth.y).toBe(first.y);
      expect(fourth.x + fourth.width).toBeGreaterThanOrEqual(2493 * 0.95);
    } finally {
      await page.emulateMedia({ reducedMotion: null });
    }
  });
  await check('Vehicle listing puts a large photo beside price, specifications and the call card', async () => {
    await page.setViewportSize({ width: 2493, height: 1265 });
    await page.goto(`${baseURL}/stock/hsv-gts-2012`);
    const stage = await page.locator('.vehicle-stage').boundingBox();
    const thumbs = await page.locator('.vehicle-thumbs').boundingBox();
    const price = await page.locator('.vehicle-price-card').boundingBox();
    const specs = await page.locator('#specifications').boundingBox();
    const call = await page.locator('.vehicle-call').boundingBox();
    expect(stage.width).toBeGreaterThan(2493 * 0.6);
    expect(stage.x).toBeLessThanOrEqual(2493 * 0.05);
    expect(thumbs.y).toBeGreaterThan(stage.y + stage.height - 1);
    expect(price.x).toBeGreaterThan(stage.x + stage.width);
    expect(specs.x).toBe(price.x);
    expect(call.x).toBe(price.x);
    expect(specs.y).toBeGreaterThan(price.y + price.height - 1);
    expect(call.y).toBeGreaterThan(specs.y + specs.height - 1);
    await expect(page.locator('#call-heading')).toHaveText('Call Us');
    await expect(page.locator('.vehicle-call').getByRole('link', { name: /0411 710 409/ })).toHaveAttribute('href', 'tel:+61411710409');
  });
  await check('Vehicle listing stacks photos, title, price, specifications then the call card on a phone', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseURL}/stock/hsv-gts-2012`);
    const order = ['.vehicle-stage', '.vehicle-head h1', '.vehicle-price-card', '.vehicle-facts', '#specifications', '.vehicle-call'];
    const tops = [];
    for (const selector of order) tops.push((await page.locator(selector).boundingBox()).y);
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    const stage = await page.locator('.vehicle-stage').boundingBox();
    expect(stage.width).toBeGreaterThan(390 * 0.85);
    const bar = page.locator('.vehicle-actionbar');
    await expect(bar).toBeVisible();
    expect(Math.round((await bar.boundingBox()).y + (await bar.boundingBox()).height)).toBe(844);
    await expect(bar.getByRole('link', { name: 'Call Us', exact: true })).toHaveAttribute('href', 'tel:+61411710409');
  });
  await check('Unknown pages use the hero slab and lead back to stock', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${baseURL}/nope`);
    await expect(page.locator('.not-found-hero h1')).toHaveText('That road ends here.');
    await page.locator('.not-found-hero').getByRole('link', { name: /Explore our stock/ }).click();
    await expect(page).toHaveURL(/\/stock$/);
  });
  await check('All local images load', async () => {
    for (const route of ['/', '/stock?status=all', firstVehicleRoute, soldVehicleRoute]) {
      await page.goto(`${baseURL}${route}`);
      // Scroll through the page like a visitor so every lazy photo starts loading.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += innerHeight / 2) {
          window.scrollTo(0, y);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      });
      await page.locator('footer').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.images].every(image => image.complete), null, { timeout: 10000 }).catch(() => {});
      const missing = await page.locator('img').evaluateAll(images => images.filter(i => !i.complete || !i.naturalWidth).map(i => i.src));
      expect(missing).toEqual([]);
      const imageURLs = await page.locator('img').evaluateAll(images => images.map(image => image.src));
      for (const imageURL of imageURLs) expect(new URL(imageURL).origin).toBe(new URL(baseURL).origin);
    }
  });
  await check('The enquiry API reports whether email is set up', async () => {
    const response = await page.request.get(`${baseURL}/api/enquiry`);
    expect(response.ok()).toBeTruthy();
    const status = await response.json();
    expect(status.ok).toBe(true);
    expect(typeof status.email).toBe('boolean');
  });
  await check('With email set up, the finance form sends the enquiry and confirms it; a failed send falls back to email or SMS', async () => {
    // Its own page, where the API's answers are stand-ins: nothing reaches a server.
    const emailed = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    try {
      const sent = [];
      let reply = { status: 200, json: { ok: true } };
      await emailed.route('**/api/enquiry', route => {
        if (route.request().method() === 'GET') return route.fulfill({ json: { ok: true, email: true } });
        sent.push({ body: route.request().postDataJSON(), header: route.request().headers()['x-mm-enquiry'] });
        return route.fulfill(reply);
      });
      const tab = await emailed.newPage();
      await tab.goto(`${baseURL}${firstVehicleRoute}`);
      await tab.getByRole('button', { name: /Apply for finance/ }).click();
      const dialog = tab.getByRole('dialog', { name: 'Apply for finance with MM Prestige Motors' });
      await expect(dialog.getByRole('button', { name: 'Send enquiry' })).toBeVisible();
      await expect(dialog.locator('.enquiry-footnote')).toContainText('mmprestigemotors@gmail.com');
      await dialog.getByLabel('Full name').fill('Website QA');
      await dialog.getByLabel('Phone number').fill('0400 000 000');
      await dialog.getByLabel('Email').fill('qa@example.com');
      await dialog.getByLabel(/^Anything else/).fill('$10,000 deposit and a trade-in.');
      await dialog.getByRole('button', { name: 'Send enquiry' }).click();
      await expect(dialog.getByText("Thanks, Website. We've got it.")).toBeVisible();
      expect(sent).toHaveLength(1);
      const [{ body, header }] = sent;
      expect(header).toBe('1');
      expect(body).toMatchObject({ kind: 'finance', name: 'Website QA', phone: '0400 000 000', email: 'qa@example.com', car: '2016 HSV GTS', page: firstVehicleRoute, website: '' });
      expect(body.message).toContain('Car: 2016 HSV GTS\n\n$10,000 deposit and a trade-in.');
      await dialog.getByRole('button', { name: 'Done' }).click();
      await expect(dialog).toHaveCount(0);
      // When the website can't send it, the visitor can.
      reply = { status: 502, json: { ok: false, code: 'send_failed', message: "Your enquiry couldn't be sent just now." } };
      await tab.getByRole('button', { name: /Apply for finance/ }).click();
      await dialog.getByLabel('Full name').fill('Website QA');
      await dialog.getByLabel('Phone number').fill('0400 000 000');
      await dialog.getByLabel('Email').fill('qa@example.com');
      await dialog.getByRole('button', { name: 'Send enquiry' }).click();
      await expect(dialog.getByText('Your message is ready.')).toBeVisible();
      await expect(dialog.locator('.enquiry-ready > p')).toContainText("Your enquiry couldn't be sent just now.");
      await expect(dialog.getByRole('link', { name: 'Send by email' })).toHaveAttribute('href', /^mailto:mmprestigemotors@gmail\.com\?subject=Finance%20enquiry/);
      await expect(dialog.getByRole('link', { name: 'Send via SMS' })).toHaveAttribute('href', /^sms:\+61411710409\?body=/);
      expect(sent).toHaveLength(2);
    } finally {
      await emailed.close();
    }
  });
  await check('The customer preview makes no real mutation requests', async () => { expect(mutationRequests).toEqual([]); });
  await check('No browser runtime errors', async () => { expect(runtimeErrors).toEqual([]); });
} finally {
  await writeFile(resolve(screenshotDir, 'functional-results.json'), JSON.stringify({ baseURL, results, runtimeErrors, mutationRequests }, null, 2));
  await browser.close();
}
const failed = results.filter(result => !result.passed);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
