/**
 * Capture sample UI screenshots for docs/REQUIREMENTS.md
 * Usage: node scripts/capture-screenshots.mjs
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const BASE = process.env.APP_URL || 'http://127.0.0.1:5173';
const OUT = path.resolve('docs/screenshots');
const ART = path.resolve('/opt/cursor/artifacts/screenshots');

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(ART, { recursive: true });

async function shot(page, name) {
  const file = `${name}.png`;
  const dest = path.join(OUT, file);
  await page.screenshot({ path: dest, fullPage: false });
  fs.copyFileSync(dest, path.join(ART, file));
  console.log('saved', file);
}

async function seedSampleData(page) {
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')];
    const seed = buttons.find((b) =>
      /sample data|generate/i.test(b.textContent || ''),
    );
    if (seed) seed.click();
  });
  await new Promise((r) => setTimeout(r, 800));
}

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900 },
});

try {
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 800));
  await shot(page, '01-dashboard');

  await seedSampleData(page);

  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '01-dashboard');

  await page.goto(`${BASE}/forms`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '02-forms');

  // Open first form edit if available
  const editHref = await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((a) =>
      /\/forms\/.+\/edit/.test(a.getAttribute('href') || ''),
    );
    return link?.getAttribute('href') || null;
  });
  if (editHref) {
    await page.goto(`${BASE}${editHref}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    await shot(page, '03-form-builder');
  }

  await page.goto(`${BASE}/workflows`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '04-workflows');

  const wfHref = await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((a) =>
      /\/workflows\/[^/]+$/.test(a.getAttribute('href') || ''),
    );
    return link?.getAttribute('href') || null;
  });
  if (wfHref) {
    await page.goto(`${BASE}${wfHref}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    await shot(page, '05-workflow-editor');
  }

  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '06-request-register');

  const detailHref = await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((a) =>
      /\/register\/.+/.test(a.getAttribute('href') || ''),
    );
    return link?.getAttribute('href') || null;
  });
  if (detailHref) {
    await page.goto(`${BASE}${detailHref}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    await shot(page, '07-request-detail');
  }

  await page.goto(`${BASE}/delegations`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '08-delegations');

  console.log('done');
} finally {
  await browser.close();
}
