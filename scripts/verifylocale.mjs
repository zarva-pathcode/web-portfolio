// The language switcher used to hardcode `/` and `/id`, so from any page other
// than the home page it either did nothing (English stayed on English) or left
// the locale in place entirely. It was also hidden below the sm breakpoint, so
// it did not exist on a phone at all.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4322';
const browser = await chromium.launch({ channel: 'chromium' });
let fails = 0;
const ok = (label, pass, detail = '') => {
  if (!pass) fails++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const ROUTES = [
  ['/', '/id'],
  ['/id', '/'],
  ['/cv', '/id/cv'],
  ['/id/cv', '/cv'],
  ['/projects/artiva', '/id/projects/artiva'],
  ['/id/projects/artiva', '/projects/artiva'],
  ['/projects/coacivo', '/id/projects/coacivo'],
  ['/blog', '/id/blog'],
  ['/id/blog', '/blog'],
  // Blog posts have no counterpart in the other language, so these must land on
  // the blog index rather than 404.
  ['/blog/why-astro', '/id/blog'],
  ['/id/blog/kenapa-astro', '/blog'],
];

for (const [from, expected] of ROUTES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + from, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const link = page.locator('header a[hreflang]').first();
  const href = await link.getAttribute('href');
  const status = await page.evaluate(async (u) => {
    const r = await fetch(u, { redirect: 'manual' });
    return r.status;
  }, href);

  const path = href.split('#')[0].replace(/\/$/, '') || '/';
  ok(
    `${from} → ${expected}`,
    path === expected && status === 200,
    `href=${href} status=${status}`,
  );
  await page.close();
}

// It has to exist on a phone too.
console.log('\nmobile 390px');
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const visible = await page.evaluate(() => {
    const a = document.querySelector('header a[hreflang]');
    if (!a) return 'missing';
    const r = a.getBoundingClientRect();
    return r.width > 0 && getComputedStyle(a).display !== 'none' ? 'visible' : 'hidden';
  });
  ok('switcher visible on mobile', visible === 'visible', String(visible));
  await page.close();
}

await browser.close();
console.log(fails === 0 ? '\nALL GREEN' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
