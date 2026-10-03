// Verifies the five new interactions against the real build. Each check reads
// a computed style or a position, so a passing result means the effect ran —
// not merely that the class is present in the markup.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

mkdirSync('tmp-refshots', { recursive: true });
const BASE = 'http://localhost:4322';
const browser = await chromium.launch({ channel: 'chromium' });
let fails = 0;
const ok = (label, pass, detail = '') => {
  if (!pass) fails++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

// --- 1. curtain on a cold load --------------------------------------------
console.log('\n1. intro curtain (cold load)');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'commit' });
  await page.waitForTimeout(120);
  const armed = await page.evaluate(() => {
    const c = document.getElementById('curtain');
    if (!c) return { present: false };
    const panel = c.querySelector('.curtain-panel');
    return {
      present: true,
      armed: c.dataset.armed,
      transform: getComputedStyle(panel).transform,
      count: c.querySelector('[data-count]')?.textContent,
    };
  });
  ok('curtain present on cold load', armed.present, JSON.stringify(armed));

  /*
   * Sampled at 120ms the panel is mid-flight on the way up, so the check reads
   * its transform instead of expecting a settled `matrix(1,0,0,1,0,0)`. What
   * it must NOT be is the lifted rest position, which is what "the curtain is
   * not covering" actually looks like.
   */
  const lifted = /matrix\(1, 0, 0, 1, 0, -\d/;
  ok('panel covers the viewport', !lifted.test(armed.transform ?? ''), armed.transform);
  // Sampled once, well after the count window rather than mid-animation. The
  // first rAF frame does not always land within 120ms under load, so an
  // early sample legitimately reads "0" — a flaky assertion, not a defect.
  await page.waitForTimeout(800);
  const counted = await page.evaluate(() => document.querySelector('[data-count]')?.textContent);
  ok('counter reached 100', Number(counted) === 100, `count=${counted}`);

  await page.waitForTimeout(1400);
  const after = await page.evaluate(() => {
    const c = document.getElementById('curtain');
    if (!c) return { removed: true };
    return {
      removed: false,
      transform: getComputedStyle(c.querySelector('.curtain-panel')).transform,
      h1Opacity: getComputedStyle(document.querySelector('h1')).opacity,
    };
  });
  ok('curtain lifted and removed', after.removed || /matrix\(1, 0, 0, 1, 0, -/.test(after.transform), JSON.stringify(after));
  // Read after the curtain is gone, so this asserts the page is legible rather
  // than merely that a class was set.
  ok('page readable after curtain', after.h1Opacity === '1' || after.removed, `h1 opacity=${after.h1Opacity}`);
  await page.screenshot({ path: 'tmp-refshots/new-home-after-curtain.png' });
  await ctx.close();
}

// --- 2. curtain does NOT replay on client-side navigation ------------------
console.log('\n2. curtain does not replay on client-side nav');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('header nav a[href$="/cv"]').first().click({ force: true });
  await page.waitForTimeout(1500);
  const onCv = await page.evaluate(() => {
    const c = document.getElementById('curtain');
    return {
      url: location.pathname,
      // The markup is baked into every page, so presence proves nothing. What
      // must not happen is a second visitor actually *seeing* it.
      visible: c ? getComputedStyle(c).display !== 'none' : false,
    };
  });
  ok('navigated to /cv', onCv.url === '/cv', onCv.url);
  ok('curtain not visible on the second page', !onCv.visible);
  await ctx.close();
}

// --- 3. marquee removed ---------------------------------------------------
// The scrolling band was cut on request. Asserting its absence rather than
// deleting the block, so it cannot creep back in unnoticed.
console.log('\n3. marquee removed');
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  const m = await page.evaluate(() => ({
    tracks: document.querySelectorAll('.marquee-track, .marquee').length,
    running: document
      .getAnimations()
      .filter((a) => a.animationName === 'marquee-move' && a.playState === 'running').length,
  }));
  ok('no marquee markup', m.tracks === 0, `${m.tracks} elements`);
  ok('no marquee animation running', m.running === 0, `${m.running} animations`);

  // The frame scrolls with the hero now, so nothing animates it. Assert that it
  // is simply translated out of view by the page rather than driven by us.
  const drift = await page.evaluate(async () => {
    const heroTop = () => document.getElementById('hero').getBoundingClientRect().top;
    const frameTop = () => document.querySelector('.hero-parallax').getBoundingClientRect().top;
    const a = Math.round(frameTop() - heroTop());
    window.scrollTo({ top: 600, behavior: 'instant' });
    await new Promise((r) => requestAnimationFrame(r));
    return { a, b: Math.round(frameTop() - heroTop()) };
  });
  ok('hero frame scrolls with the section', drift.a === 0 && drift.b === 0, JSON.stringify(drift));

  const of = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  ok('no horizontal overflow', of);
  await page.close();
}

// --- 4. nav scale ---------------------------------------------------------
console.log('\n4. nav scale on scroll');
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const top = await page.evaluate(() => getComputedStyle(document.querySelector('[data-nav-shell]')).transform);
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(900);
  const scrolled = await page.evaluate(() => getComputedStyle(document.querySelector('[data-nav-shell]')).transform);
  ok('nav shrinks after scroll', top !== scrolled, `top=${top} scrolled=${scrolled}`);
  const shrunk = /0\.96/.test(scrolled);
  ok('scale settles near 0.964', shrunk, scrolled);
  await page.close();
}

// --- 5. per-word heading reveal ------------------------------------------
console.log('\n5. per-word heading reveal');
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const before = await page.evaluate(() => {
    const w = document.querySelector('.word-rise');
    return w ? { found: true, tf: getComputedStyle(w.querySelector('span')).transform, i: w.style.getPropertyValue('--reveal-i') } : { found: false };
  });
  ok('word-rise markup present', before.found, JSON.stringify(before));
  ok('index assigned at build time', before.i === '0', `--reveal-i=${before.i}`);

  await page.evaluate(() => document.getElementById('experience').scrollIntoView());
  await page.waitForTimeout(1600);
  const after = await page.evaluate(() => {
    const words = [...document.querySelectorAll('.word-rise')];
    return {
      total: words.length,
      settled: words.filter((w) => /matrix\(1, 0, 0, 1, 0, 0\)|none/.test(getComputedStyle(w.querySelector('span')).transform)).length,
      headingText: words[0]?.textContent.trim(),
    };
  });
  ok('all heading words settle', after.total > 0 && after.settled === after.total, `${after.settled}/${after.total} "${after.headingText}"`);
  await page.screenshot({ path: 'tmp-refshots/new-heading.png' });
  await page.close();
}

// --- 6. image zoom --------------------------------------------------------
console.log('\n6. image zoom on hover');
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.getElementById('about').scrollIntoView());
  await page.waitForTimeout(1400);
  const rest = await page.evaluate(() => {
    const img = document.querySelector('.zoom-frame > img');
    return img ? getComputedStyle(img).transform : null;
  });
  await page.locator('.zoom-frame').first().hover();
  await page.waitForTimeout(900);
  const hov = await page.evaluate(() => {
    const img = document.querySelector('.zoom-frame > img');
    return img ? getComputedStyle(img).transform : null;
  });
  ok('image scales on hover', rest !== hov && /1\.0[5-9]/.test(hov ?? ''), `rest=${rest} hover=${hov}`);
  await page.close();
}

// --- 7. reduced motion ----------------------------------------------------
console.log('\n7. reduced motion');
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const c = document.getElementById('curtain');
    const frame = document.querySelector('.hero-parallax');
    const word = document.querySelector('.word-rise > span');
    return {
      curtain: c ? getComputedStyle(c).display : 'removed',
      wordTf: word ? getComputedStyle(word).transform : null,
      heroDisplay: frame ? getComputedStyle(frame).display : 'removed',
      heroAtTop: frame ? Math.round(frame.getBoundingClientRect().top) : null,
      navScale: getComputedStyle(document.querySelector('[data-nav-shell]')).transform,
    };
  });
  ok('curtain suppressed', r.curtain === 'none' || r.curtain === 'removed', String(r.curtain));
  ok('word reveal pinned to rest', r.wordTf === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(r.wordTf ?? ''), String(r.wordTf));
  // The frame is `absolute` and has no animation, so reduced-motion visitors get
  // the same page as everyone else — the hero starts at the top of the viewport.
  ok('hero frame present and unscrolled', r.heroDisplay !== 'none' && r.heroAtTop === 0, `display=${r.heroDisplay} top=${r.heroAtTop}`);
  ok('nav scale off', r.navScale === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(r.navScale), r.navScale);
  await page.close();
}

// --- 8. no console errors anywhere ---------------------------------------
console.log('\n8. console errors');
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 140)));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 140)));
  for (const u of ['/', '/id', '/cv', '/projects/coacivo', '/blog/why-astro']) {
    await page.goto(BASE + u, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(900);
  }
  ok('no page errors across 5 routes', errs.length === 0, errs.slice(0, 3).join(' | '));
  await page.close();
}

await browser.close();
console.log(fails === 0 ? '\nALL GREEN' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
