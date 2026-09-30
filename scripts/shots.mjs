// Full-page and section screenshots. Run against `astro preview` on :4321.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4321';
const OUT = 'C:/Users/FUJITSU/AppData/Local/Temp/opencode/shots';
mkdirSync(OUT, { recursive: true });

const shots = [
  { name: 'final-home-desktop', path: '/', width: 1440, full: true },
  { name: 'final-home-mobile', path: '/', width: 390, full: true },
  { name: 'final-home-id', path: '/id', width: 1440, full: false },
  { name: 'final-project', path: '/projects/coacivo', width: 1440, full: true },
  { name: 'final-cv', path: '/cv', width: 1280, full: true },
  { name: 'final-blog', path: '/blog', width: 1440, full: false },
  { name: 'final-post', path: '/blog/why-astro', width: 1440, full: false },
];

const browser = await chromium.launch({ channel: 'chromium' });
const problems = [];

for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: shot.width, height: 1000 } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(BASE + shot.path, { waitUntil: 'networkidle' });

  if (shot.full) {
    // A fullPage capture resizes the viewport to the whole document, which
    // re-evaluates every view() timeline at once and leaves below-the-fold
    // reveals at their opacity-0 start state. Pin the settled state so the
    // image represents what a reader actually sees while scrolling.
    await page.addStyleTag({
      content: `
        .reveal { animation: none !important; opacity: 1 !important; transform: none !important; }
        .hero-portrait { animation: none !important; }
        .hero-parallax { animation: none !important; transform: none !important; }
        .spine-draw { animation: none !important; transform: scaleY(1) !important; }
      `,
    });

    // Walk the page so lazy images commit. A fullPage capture expands the
    // viewport, which would otherwise kick off every lazy image at once and
    // photograph them mid-decode — so promote them to eager and wait.
    await page.evaluate(async () => {
      for (const img of document.querySelectorAll('img[loading="lazy"]')) {
        img.loading = 'eager';
      }
      const step = window.innerHeight * 0.7;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
      window.scrollTo(0, 0);
    });

    await page
      .waitForFunction(
        () => [...document.images].every((img) => img.complete && img.naturalWidth > 0),
        null,
        { timeout: 25000 },
      )
      .catch(() => console.log(`  ${shot.name}: some images still loading`));
  }

  await page.waitForTimeout(500);

  await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: shot.full });
  if (errors.length) problems.push(`${shot.name}: ${errors.join(' | ')}`);
  console.log(`shot ${shot.name}${errors.length ? '  (console errors!)' : ''}`);
  await page.close();
}

await browser.close();
console.log(problems.length ? '\nERRORS:\n' + problems.join('\n') : '\nno console errors');
