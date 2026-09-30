// Confirms each scroll-driven effect actually reaches its expected value at a
// given scroll position, rather than merely existing in the stylesheet.
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

// Same target as finalcheck: a real build served by `astro preview`, not the
// dev server, so what is measured is what would actually be deployed.
await page.goto('http://localhost:4322/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2200); // let the word stagger finish

const support = await page.evaluate(() => ({
  view: CSS.supports('animation-timeline', 'view()'),
  scroll: CSS.supports('animation-timeline', 'scroll()'),
}));
console.log('animation-timeline support  view:', support.view, ' scroll:', support.scroll);

const sample = () =>
  page.evaluate(() => {
    const img = document.querySelector('.hero-parallax');
    const frame = document.querySelector('.hero-parallax');
    const spine = document.querySelector('.spine-draw');
    const bar = document.querySelector('header');
    const prog = document.querySelector('.scroll-progress');
    const word = document.querySelector('.word');
    const g = (el) => (el ? getComputedStyle(el) : null);
    return {
      y: Math.round(window.scrollY),
      heroFilter: g(img)?.filter,
      heroTransform: g(frame)?.transform,
      spineTransform: g(spine)?.transform,
      navBg: g(bar)?.backgroundColor,
      progressTransform: g(prog)?.transform,
      wordTransform: g(word)?.transform,
    };
  });

// Sample at rest, then progressively through the page.
const steps = [0, 400, 900, 1600];
for (const y of steps) {
  await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), y);
  await page.waitForTimeout(450);
  const s = await sample();
  console.log(`\ny=${s.y}`);
  console.log('  hero filter   ', s.heroFilter);
  console.log('  hero transform', s.heroTransform);
  console.log('  spine         ', s.spineTransform);
  console.log('  nav bg        ', s.navBg);
  console.log('  progress      ', s.progressTransform);
  if (y === 0) console.log('  word[0]       ', s.wordTransform);
}

// The spine lives in #experience, so scroll it into view and check it grows.
await page.evaluate(() => {
  const el = document.querySelector('#experience');
  window.scrollTo({ top: el.offsetTop - 200, behavior: 'instant' });
});
await page.waitForTimeout(400);
const early = await page.evaluate(
  () => getComputedStyle(document.querySelector('.spine-draw')).transform,
);
await page.evaluate(() => {
  const el = document.querySelector('#experience');
  window.scrollTo({ top: el.offsetTop + 400, behavior: 'instant' });
});
await page.waitForTimeout(400);
const late = await page.evaluate(
  () => getComputedStyle(document.querySelector('.spine-draw')).transform,
);
console.log(`\nspine when section enters: ${early}`);
console.log(`spine once read past     : ${late}`);

console.log(errors.length ? `\nERRORS: ${errors.join(' | ')}` : '\nno page errors');
await browser.close();
