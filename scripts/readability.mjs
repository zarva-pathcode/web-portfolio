// The invariant this change is meant to guarantee: no text on the site is ever
// unreadable because of a scroll animation. Walks the whole page and asserts
// every text element is legible at every scroll position, with no exceptions.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4322';
const ROUTES = ['/', '/id', '/cv', '/blog', '/blog/why-astro', '/projects/coacivo', '/projects/artiva', '/id/projects/artiva'];

const browser = await chromium.launch({ channel: 'chromium' });
let fails = 0;
const ok = (label, pass, detail = '') => {
  if (!pass) fails++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

/** Leaf text elements, i.e. the ones that actually carry words. */
const TEXT_SELECTOR = `p, h1, h2, h3, h4, li, dt, dd, span.tag, time, a.btn-primary, a.btn-ghost`;

for (const route of ROUTES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2400); // let the curtain finish and the word stagger settle

  const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  const violations = [];

  // Coarse sweep of the whole page.
  for (let y = 0; y <= max + 400; y += 200) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(70);

    const bad = await page.evaluate((sel) => {
      const out = [];
      for (const el of document.querySelectorAll(sel)) {
        const text = (el.textContent || '').trim();
        if (!text || text.length < 2) continue;
        // Only elements actually inside the viewport can be "read".
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        if (r.width === 0 || r.height === 0) continue;

        const cs = getComputedStyle(el);
        const op = parseFloat(cs.opacity);
        if (op < 0.95 || cs.visibility === 'hidden') {
          out.push({ text: text.replace(/\s+/g, ' ').slice(0, 34), op, vis: cs.visibility, y: Math.round(r.top) });
        }
      }
      return out;
    }, TEXT_SELECTOR);

    if (bad.length) violations.push({ scrollY: y, items: bad.slice(0, 3) });
  }

  ok(
    `${route} — no invisible text at any scroll position`,
    violations.length === 0,
    violations.length ? `first bad @y=${violations[0].scrollY}: ${JSON.stringify(violations[0].items)}` : '',
  );
  await page.close();
}

// Reduced motion must not reintroduce hiding either.
console.log('\nreduced motion');
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const hidden = [...document.querySelectorAll('.reveal, .reveal-group > *, .word-rise')].filter(
      (el) => parseFloat(getComputedStyle(el).opacity) < 0.95,
    ).length;
    return { hidden, total: document.querySelectorAll('.reveal, .reveal-group > *, .word-rise').length };
  });
  ok('nothing hidden under reduced motion', r.hidden === 0, `${r.hidden}/${r.total} hidden`);
  await page.close();
}

await browser.close();
console.log(fails === 0 ? '\nALL GREEN' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
