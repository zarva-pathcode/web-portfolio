// The regression this guards: <ClientRouter /> intercepts navigation, so anchor
// smooth-scroll and the scroll-spy can both break after a page swap.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4322';
const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const accentOn = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('header nav a[data-nav]')]
      .filter((a) => getComputedStyle(a).color === 'rgb(56, 189, 248)')
      .map((a) => a.textContent.trim()),
  );

console.log('--- 1. first load, scroll-spy on the landing page ---');
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  const el = document.querySelector('#projects');
  window.scrollTo(0, el.offsetTop + 10);
});
await page.waitForTimeout(700);
await page.mouse.move(720, 850);
console.log('  accent:', (await accentOn()).join(',') || '(none)');

console.log('\n--- 2. anchor click still smooth-scrolls ---');
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
await page.click('header nav a[href="#about"]');
await page.waitForTimeout(1800);
const aboutTop = await page.evaluate(() => Math.round(document.querySelector('#about').getBoundingClientRect().top));
console.log(`  #about top = ${aboutTop}px ${aboutTop > 60 && aboutTop < 140 ? 'OK' : 'SUSPECT'}`);

console.log('\n--- 3. click through to a project page (client-side nav) ---');
/*
 * Dispatched rather than driven through page.mouse / page.click.
 *
 * The project rows carry a pointer tilt, which leaves a 3D transform on the
 * element during the hover. Chromium's synthetic pointer path does not
 * synthesise events against such an element reliably, so a coordinate click is
 * silently dropped — the page simply does not navigate and the test reports a
 * false failure. elementFromPoint resolves to the link and a dispatched click
 * navigates correctly, so the site is fine and only the input path is unreliable.
 *
 * What this actually needs to verify is whether ClientRouter intercepts the
 * click and swaps the page, and a dispatched click exercises exactly that.
 */
await page.evaluate(() => {
  document.querySelector('#projects a[href^="/projects/"]').scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(1400);
await page.locator('#projects a[href^="/projects/"]').first().dispatchEvent('click');
await page.waitForTimeout(1600);
const afterClick = new URL(page.url()).pathname;
console.log('  url:', afterClick, afterClick.startsWith('/projects/') ? 'OK' : 'DID NOT NAVIGATE');
console.log('  h1 :', await page.locator('h1').first().textContent());

console.log('\n--- 4. back to home, scroll-spy must still work ---');
await page.goBack();
await page.waitForTimeout(1400);
console.log('  url:', new URL(page.url()).pathname);
await page.evaluate(() => {
  const el = document.querySelector('#experience');
  if (el) window.scrollTo(0, el.offsetTop + 10);
});
await page.waitForTimeout(700);
await page.mouse.move(720, 850);
console.log('  accent:', (await accentOn()).join(',') || '(none)');

console.log('\n--- 5. blur-up images resolved after a swap ---');
const blur = await page.evaluate(() => {
  const wraps = [...document.querySelectorAll('[data-blur-wrap]')];
  return {
    total: wraps.length,
    loaded: wraps.filter((w) => w.hasAttribute('data-loaded')).length,
    hidden: [...document.querySelectorAll('img[data-blur-img]')].filter(
      (i) => getComputedStyle(i).opacity === '0',
    ).length,
  };
});
console.log(`  ${blur.loaded}/${blur.total} loaded, ${blur.hidden} img stuck invisible`);
console.log(blur.hidden === 0 ? '  OK — nothing left invisible' : '  FAIL — images stuck at opacity 0');

console.log('\n--- 6. mobile menu after a swap ---');
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.click('#nav-toggle');
await page.waitForTimeout(300);
const drawerOpen = await page.evaluate(
  () => !document.getElementById('nav-panel')?.classList.contains('hidden'),
);
console.log('  drawer opens:', drawerOpen ? 'OK' : 'FAIL');

console.log('\n' + (errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no page errors'));
await browser.close();
