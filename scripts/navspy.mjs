// Verifies the scroll-spy actually tracks position, and that the accent stays
// off every non-active nav link.
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://localhost:4322/', { waitUntil: 'networkidle' });
// Park the pointer away from the bar so :hover does not mask the spy state.
await page.mouse.move(720, 700);

const read = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('header nav a[data-nav]')].map((a) => ({
      label: a.textContent.trim(),
      color: getComputedStyle(a).color,
    })),
  );

const stops = [
  ['top', 0],
  ['#about', '#about'],
  ['#experience', '#experience'],
  ['#projects', '#projects'],
  ['bottom', 'bottom'],
];

for (const [name, target] of stops) {
  if (target === 'bottom') {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  } else if (typeof target === 'string') {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      window.scrollTo(0, el.offsetTop + 10);
    }, target);
  } else {
    await page.evaluate((y) => window.scrollTo(0, y), target);
  }
  // Smooth scrolling means the page is still settling well after the scroll call.
  await page.waitForTimeout(1600);
  await page.mouse.move(720, 700);
  await page.waitForTimeout(120);
  const rows = await read();
  const lit = rows.filter((r) => r.color === 'rgb(56, 189, 248)');
  console.log(
    `at ${name.padEnd(12)} accent on: ${lit.map((r) => r.label).join(',') || '(none)'}  ` +
      `| others: ${rows.filter((r) => r.color !== 'rgb(56, 189, 248)').map((r) => r.color.replace('rgb(', '').replace(')', '')).join(' ')}`,
  );
}

await page.screenshot({ path: 'C:/Users/FUJITSU/AppData/Local/Temp/opencode/shots/accent-nav-spy.png' });
console.log(errors.length ? `ERRORS: ${errors.join(' | ')}` : 'no page errors');
await browser.close();
