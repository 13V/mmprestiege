import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = resolve(root, 'public');
const output = resolve(root, 'public/presentation/MM-Prestiege-Motors-Presentation.pdf');
const types = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };
const server = createServer(async (request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const filename = resolve(publicRoot, `.${pathname}`);
    if (!filename.startsWith(`${publicRoot}${sep}`)) {
      response.writeHead(403).end();
      return;
    }
    const content = await readFile(filename);
    response.writeHead(200, { 'Content-Type': types[extname(filename)] || 'application/octet-stream' });
    response.end(content);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolveReady, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolveReady);
});
const executablePath = process.env.MM_CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/presentation/`);
  await page.evaluate(() => document.fonts.ready);
  const broken = await page.evaluate(async () => {
    await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
    return [...document.images].filter(img => !img.complete || img.naturalWidth === 0).map(img => img.getAttribute('src'));
  });
  if (broken.length || errors.length) throw new Error(`Presentation could not render: ${JSON.stringify({ broken, errors })}`);
  await page.pdf({ path: output, printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, tagged: true, outline: true });
  console.log(`Created ${output}`);
  const draft = await readFile(resolve(root, 'docs/presentation/email-draft.md'), 'utf8');
  const subject = draft.match(/^\*\*Subject:\*\* (.+)$/m);
  if (!subject) throw new Error('The email draft needs a Subject line.');
  const body = draft.slice(subject.index + subject[0].length).split(/\n---\s*\n/)[0].trim().replace(/\*\*/g, '');
  const boundary = `mm-prestiege-${randomUUID()}`;
  const base64 = data => Buffer.from(data).toString('base64').match(/.{1,76}/g).join('\r\n');
  const filename = 'MM-Prestiege-Motors-Presentation.pdf';
  const message = [
    'X-Unsent: 1',
    `Subject: =?UTF-8?B?${Buffer.from(subject[1]).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    'Content-Transfer-Encoding: base64',
    '',
    base64(body),
    `--${boundary}`,
    `Content-Type: application/pdf; name="${filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${filename}"`,
    '',
    base64(await readFile(output)),
    `--${boundary}--`,
    '',
  ].join('\r\n');
  const emailOutput = resolve(root, 'docs/presentation/MM-Prestiege-Motors-Email-Draft.eml');
  await writeFile(emailOutput, message);
  console.log(`Created ${emailOutput} with the PDF attached. No recipient set and no email sent.`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolveClosed => server.close(resolveClosed));
}
