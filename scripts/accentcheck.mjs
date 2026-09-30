// Screenshots the accent system, including hover and focus states, which a
// static full-page capture never shows.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4321';
const OUT = 'C:/Users/FUJITSU/AppData/Local/Temp/opencode/shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chromium' });
const errors = [];

// --- sections at rest -------------------------------------------------------
for (const [name, sel] of [
  ['accent-whatido', '#what-i-do'],
  ['accent-experience', '#experience'],
  ['accent-projects', '#projects'],
  ['accent-about', '#about'],
]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (e) => errors.push(`${name}: ${e}`));
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.addStyleTag({
    content: '.reveal{animation:none !important;opacity:1 !important;transform:none !important}',
  });
  const el = page.locator(sel);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  await el.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
  await page.close();
}

// --- hover states -----------------------------------------------------------
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', (e) => errors.push(`hover: ${e}`));
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.addStyleTag({
  content: '.reveal{animation:none !important;opacity:1 !important;transform:none !important}',
});

// Primary button hover
await page.locator('#hero a.btn-primary').hover();
await page.waitForTimeout(400);
await page
  .locator('#hero')
  .screenshot({ path: `${OUT}/accent-hover-button.png` });
const btn = await page.locator('#hero a.btn-primary').evaluate((el) => {
  const s = getComputedStyle(el);
  return { bg: s.backgroundColor, shadow: s.boxShadow };
});
console.log('button hover bg:', btn.bg);
console.log('button hover shadow:', btn.shadow);

// Nav active after scrolling into a section
await page.locator('header nav a[href="#projects"]').click();
await page.waitForTimeout(1400);
const active = await page.locator('header nav a[href="#projects"]').evaluate((el) => ({
  color: getComputedStyle(el).color,
  text: el.textContent.trim(),
}));
console.log('nav active:', active.text, '->', active.color);

// Form focus ring
await page.locator('#contact-form input[name="name"]').focus();
await page.waitForTimeout(250);
await page
  .locator('#contact-form')
  .screenshot({ path: `${OUT}/accent-hover-focus.png` });
const ring = await page
  .locator('#contact-form input[name="name"]')
  .evaluate((el) => {
    const s = getComputedStyle(el);
    return { outline: s.outline, offset: s.outlineOffset };
  });
console.log('focus ring:', ring.outline, 'offset', ring.offset);

await page.close();
await browser.close();
console.log(errors.length ? `\nERRORS:\n${errors.join('\n')}` : '\nno page errors');
