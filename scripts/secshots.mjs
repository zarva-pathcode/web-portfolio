import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4321';
const OUT = 'C:/Users/FUJITSU/AppData/Local/Temp/opencode/shots';
mkdirSync(OUT, { recursive: true });

const targets = [
  { name: 'v2-hero', path: '/', sel: '#hero' },
  { name: 'v2-about', path: '/', sel: '#about' },
  { name: 'v2-whatido', path: '/', sel: '#what-i-do' },
  { name: 'v2-experience', path: '/', sel: '#experience' },
  { name: 'v2-projects', path: '/', sel: '#projects' },
  { name: 'v2-archive', path: '/', sel: '#archive' },
];

const width = Number(process.argv[2] ?? 1440);

const browser = await chromium.launch({ channel: 'chromium' });

for (const t of targets) {
  const page = await browser.newPage({
    viewport: { width, height: 1000 },
    deviceScaleFactor: width > 800 ? 1 : 2,
  });
  await page.goto(BASE + t.path, { waitUntil: 'networkidle' });
  // Show the settled state, not the scroll-reveal midpoint.
  await page.addStyleTag({
    content: '.reveal{animation:none !important;opacity:1 !important;transform:none !important}',
  });
  // Let lazy images commit so a cover is never photographed as its placeholder.
  await page.evaluate(() => {
    for (const img of document.querySelectorAll('img[loading="lazy"]')) img.loading = 'eager';
  });
  await page
    .waitForFunction(
      () => [...document.images].every((img) => img.complete && img.naturalWidth > 0),
      null,
      { timeout: 20000 },
    )
    .catch(() => console.log(`  ${t.name}: some images still loading`));

  const el = page.locator(t.sel);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const suffix = width > 800 ? '' : '-m';
  await el.screenshot({ path: `${OUT}/${t.name}${suffix}.png` });

  const box = await el.boundingBox();
  console.log(t.name, box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'NOT FOUND');
  await page.close();
}

await browser.close();
