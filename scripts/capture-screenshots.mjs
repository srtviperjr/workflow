/**
 * Capture UI screenshots for docs (REQUIREMENTS + USER_GUIDE).
 * Usage: npm run screenshots   (dev server must be running)
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
  await page.goto(`${BASE}/data-tools`, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button')];
    const seed = buttons.find((b) =>
      /data tools|sample data|generate|run/i.test(b.textContent || ''),
    );
    if (seed) seed.click();
  });
  await new Promise((r) => setTimeout(r, 1000));
}

async function firstHref(page, pattern) {
  return page.evaluate((reSource) => {
    const re = new RegExp(reSource);
    const link = [...document.querySelectorAll('a')].find((a) =>
      re.test(a.getAttribute('href') || ''),
    );
    return link?.getAttribute('href') || null;
  }, pattern);
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
  await shot(page, '12-data-tools');

  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '01-dashboard');

  await page.goto(`${BASE}/requests`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '02-requests');

  await page.goto(`${BASE}/forms`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '03-forms');

  // Prefer Change Request builder (shows Attachment file field)
  let editHref = await page.evaluate(() => {
    const all = [...document.querySelectorAll('a')].map((a) => a.getAttribute('href') || '');
    const change = all.find((h) => h.includes('form-change') && h.includes('/edit'));
    const anyEdit = all.find((h) => /\/forms\/.+\/edit/.test(h));
    return change || anyEdit || null;
  });
  if (!editHref) {
    editHref = await firstHref(page, '\\/forms\\/.+\\/edit');
  }
  if (editHref) {
    await page.goto(`${BASE}${editHref}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 700));
    await shot(page, '04-form-builder');
  }

  await page.goto(`${BASE}/workflows`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '05-workflows');

  const wfHref = await firstHref(page, '\\/workflows\\/[^/]+$');
  if (wfHref) {
    await page.goto(`${BASE}${wfHref}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1000));
    await shot(page, '06-workflow-editor');
  }

  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '07-request-register');

  const formRegHref = await firstHref(page, '\\/register\\/form\\/');
  if (formRegHref) {
    await page.goto(`${BASE}${formRegHref}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    await shot(page, '08-form-register');
  } else {
    // Fallback: open Change Request form register directly
    await page.goto(`${BASE}/register/form/form-change`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    await shot(page, '08-form-register');
  }

  const detailHref = await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((a) => {
      const href = a.getAttribute('href') || '';
      return /\/register\/.+/.test(href) && !href.includes('/register/form/');
    });
    return link?.getAttribute('href') || null;
  });
  // Prefer a change-request detail if listed on overall register
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));
  const changeDetail = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('tr, a')];
    for (const el of rows) {
      const text = (el.textContent || '').toLowerCase();
      const href = el.getAttribute?.('href') || '';
      if (text.includes('change') && /\/register\/.+/.test(href) && !href.includes('/form/')) {
        return href;
      }
    }
    const any = [...document.querySelectorAll('a')].find((a) => {
      const href = a.getAttribute('href') || '';
      return /\/register\/.+/.test(href) && !href.includes('/register/form/');
    });
    return any?.getAttribute('href') || null;
  });
  const openDetail = changeDetail || detailHref;
  if (openDetail) {
    await page.goto(`${BASE}${openDetail}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 700));
    await shot(page, '09-request-detail');
  }

  // Submit page for Change Request (file attachment field)
  await page.goto(`${BASE}/forms/form-change/submit`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));
  await shot(page, '10-submit-change-request');

  await page.goto(`${BASE}/delegations`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '11-delegations');

  await page.goto(`${BASE}/notifications`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '13-notifications');

  await page.goto(`${BASE}/notification-templates`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '16-notification-templates');

  const tplEditHref = await firstHref(page, '\\/notification-templates\\/.+\\/edit');
  if (tplEditHref) {
    await page.goto(`${BASE}${tplEditHref}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 700));
    await shot(page, '17-notification-template-editor');
  }

  await page.goto(`${BASE}/users`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '14-users');

  await page.goto(`${BASE}/roles`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '15-roles');

  await page.goto(`${BASE}/integrations`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, '18-integrations');

  console.log('done');
} finally {
  await browser.close();
}
