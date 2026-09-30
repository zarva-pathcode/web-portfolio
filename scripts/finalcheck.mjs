// Final gate: the things most likely to have regressed across the motion work.
import { chromium } from 'playwright';

/**
 * Checks run against a real build via `astro preview`, not the dev server: the
 * sitemap is generated at build time, so `/sitemap-index.xml` only exists in
 * `dist/`. Port 4322 is deliberately left to the dev server.
 */
const BASE = 'http://localhost:4322';
const browser = await chromium.launch({ channel: 'chromium' });
let failures = 0;

const ok = (label, pass, detail = '') => {
  if (!pass) failures++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  â€” ' + detail : ''}`);
};

// --- reduced motion ---------------------------------------------------------
console.log('prefers-reduced-motion: reduce');
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const r = await page.evaluate(() => {
    const g = (s) => {
      const el = document.querySelector(s);
      return el ? getComputedStyle(el) : null;
    };
    return {
      heroFilter: g('.hero-parallax')?.filter,
      heroTransform: g('.hero-parallax')?.transform,
      spine: g('.spine-draw')?.transform,
      navBg: g('.nav-condense')?.backgroundColor,
      progressShown: g('.scroll-progress') ? getComputedStyle(document.querySelector('.scroll-progress')).display : 'n/a',
      revealOpacity: g('.reveal')?.opacity,
    };
  });
  ok('hero keeps its colour', !r.heroFilter.includes('grayscale'), r.heroFilter);
  ok('no parallax', r.heroTransform === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(r.heroTransform), r.heroTransform);
  ok('spine fully drawn', r.spine.includes('matrix(1, 0, 0, 1'), r.spine);
  ok('nav shown as glass', r.navBg.includes('0.75'), r.navBg);
  ok('progress bar hidden', r.progressShown === 'none', r.progressShown);
  ok('reveal content visible', r.revealOpacity === '1', r.revealOpacity);
  await page.close();
}

// --- print ------------------------------------------------------------------
console.log('\n@media print on /cv');
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.goto(BASE + '/cv', { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  const r = await page.evaluate(() => ({
    nav: getComputedStyle(document.querySelector('header')).display,
    footer: getComputedStyle(document.querySelector('footer')).display,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    headline: getComputedStyle(document.querySelector('h1')).color,
  }));
  ok('nav hidden', r.nav === 'none', r.nav);
  ok('footer hidden', r.footer === 'none', r.footer);
  ok('white background', r.bodyBg.includes('255, 255, 255'), r.bodyBg);
  ok('black headline', r.headline.includes('0, 0, 0'), r.headline);
  await page.close();
}

// --- mobile layout ----------------------------------------------------------
console.log('\nmobile 390px');
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  // The last word starts at 9 x 90ms and runs for 900ms, so the whole sequence
  // needs ~1.7s. The old 900ms window sampled it mid-flight and read the
  // overshoot keyframe as "still animating".
  await page.waitForTimeout(2200);
  const r = await page.evaluate(() => ({
    hScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
    words: document.querySelectorAll('.word').length,
    wordsHidden: [...document.querySelectorAll('.word')].filter(
      (w) => getComputedStyle(w).transform !== 'matrix(1, 0, 0, 1, 0, 0)',
    ).length,
  }));
  ok('no horizontal scroll', !r.hScroll, `${r.scrollW} vs ${r.innerW}`);
  ok('all headline words revealed', r.wordsHidden === 0, `${r.words - r.wordsHidden}/${r.words}`);
  await page.close();
}

// --- every route ------------------------------------------------------------
console.log('\nroutes');
{
  const page = await browser.newPage();
  const routes = [
    '/', '/projects/coacivo', '/projects/artiva', '/projects/rektor-cup',
    '/blog', '/blog/why-astro', '/cv',
    '/id', '/id/cv', '/id/blog', '/id/blog/kenapa-astro',
    '/id/projects/coacivo', '/id/projects/artiva', '/id/projects/rektor-cup',
    '/rss.xml', '/sitemap-index.xml', '/og.png', '/robots.txt', '/favicon.svg',
  ];
  let bad = [];
  for (const r of routes) {
    const res = await page.goto(BASE + r, { waitUntil: 'domcontentloaded' }).catch(() => null);
    if (!res || res.status() !== 200) bad.push(`${r} -> ${res ? res.status() : 'err'}`);
  }
  const nf = await page.goto(BASE + '/nope').catch(() => null);
  ok(`${routes.length} routes 200`, bad.length === 0, bad.join(', '));
  ok('/nope -> 404', nf?.status() === 404, String(nf?.status()));
  await page.close();
}

await browser.close();
console.log(failures === 0 ? '\nALL GREEN' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);

