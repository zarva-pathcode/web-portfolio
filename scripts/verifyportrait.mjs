// The hero portrait must belong to the hero section.
//
// It used to be `position: fixed`, which pinned the photo to the viewport: it
// stayed put while the page moved under it, and three separate scroll-driven
// effects existed only to manage a frame that was never where it looked. That
// frame is now `absolute` inside the section, so the browser scrolls it out on
// its own and there is nothing left to animate.
//
// The invariant is therefore positional: the portrait's top must track the
// hero's top exactly, at every scroll position, and it must be off-screen once
// the hero has left.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4322';
const SECTIONS = ['about', 'what-i-do', 'experience', 'projects', 'archive', 'contact-form'];

const browser = await chromium.launch({ channel: 'chromium' });
let fails = 0;
const ok = (label, pass, detail = '') => {
  if (!pass) fails++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2600);

const frame = () =>
  page.evaluate(() => {
    const f = document.querySelector('.hero-parallax');
    const h = document.getElementById('hero');
    const img = document.querySelector('.hero-ambient-img');
    if (!f || !h) return null;
    const fr = f.getBoundingClientRect();
    const m = new DOMMatrixReadOnly(getComputedStyle(f).transform);
    return {
      // Distance from the frame's top to the hero's top. Must be zero: a
      // `fixed` frame reports a growing offset as the page scrolls.
      delta: Math.round(fr.top - h.getBoundingClientRect().top),
      bottom: Math.round(fr.bottom),
      position: getComputedStyle(f).position,
      opacity: img ? parseFloat(getComputedStyle(img).opacity) : null,
      scale: +Math.max(m.a, m.d).toFixed(3),
    };
  });

// --- the frame is not pinned to the viewport -------------------------------
console.log('\nframe positioning');
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await page.waitForTimeout(400);
const atTop = await frame();
ok('frame is absolute, not fixed', atTop.position === 'absolute', atTop.position);
ok('portrait aligned with the hero', atTop.delta === 0, `offset=${atTop.delta}`);

console.log('\nportrait tracks the hero, not the viewport');
for (const y of [200, 400, 600, 800]) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await page.waitForTimeout(300);
  const r = await frame();
  ok(`scrollY=${y} — still locked to the hero`, r.delta === 0, `offset=${r.delta}`);
}

// --- nothing fades or scales it -------------------------------------------
// A partial opacity is what made the element's own box read as a rectangle
// against the black canvas. With no scroll-driven effect at all, that state
// cannot be reached.
console.log('\nportrait never fades or scales');
for (const y of [0, 300, 500, 700, 900, 1100]) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await page.waitForTimeout(250);
  const r = await frame();
  ok(`scrollY=${y} — opaque and unscaled`, r.opacity === 1 && r.scale === 1, `opacity=${r.opacity} scale=${r.scale}`);
}

// --- it leaves with the hero ----------------------------------------------
console.log('\nportrait leaves with the hero');
await page.evaluate(() => {
  const heroBottom = document.getElementById('hero').getBoundingClientRect().bottom + scrollY;
  window.scrollTo({ top: heroBottom, behavior: 'instant' });
});
await page.waitForTimeout(500);
const gone = await frame();
ok('off-screen once the hero has cleared', gone.bottom <= 0, `bottom=${gone.bottom}`);

for (const id of SECTIONS) {
  await page.evaluate((sid) => {
    const el = document.getElementById(sid);
    const heroBottom = document.getElementById('hero').getBoundingClientRect().bottom + scrollY;
    window.scrollTo({
      top: Math.max(el.getBoundingClientRect().top + scrollY - 100, heroBottom),
      behavior: 'instant',
    });
  }, id);
  await page.waitForTimeout(400);
  const r = await frame();
  ok(`#${id} — portrait not over the section`, r.bottom <= 0, `bottom=${r.bottom}`);
}

// --- the regression that started all of this -------------------------------
// A near-black gradient at full strength reads as a dark rectangle, not as a
// portrait. The scrims are inside the frame, so if the frame is gone they are
// too — but assert it rather than assume it.
console.log('\nno scrim painting over the lower sections');
for (const id of ['about', 'projects', 'archive']) {
  await page.evaluate((sid) => {
    const el = document.getElementById(sid);
    const heroBottom = document.getElementById('hero').getBoundingClientRect().bottom + scrollY;
    window.scrollTo({
      top: Math.max(el.getBoundingClientRect().top + scrollY - 100, heroBottom),
      behavior: 'instant',
    });
  }, id);
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const f = document.querySelector('.hero-parallax').getBoundingClientRect();
    return [...document.querySelectorAll('.hero-scrim')].map((e) => {
      const b = e.getBoundingClientRect();
      return { width: Math.round(b.width), frameWidth: Math.round(f.width) };
    });
  });
  ok(`#${id} — scrims inside the frame`, r.every((s) => s.width <= s.frameWidth), r.map((s) => `${s.width}/${s.frameWidth}`).join(' '));
}

// --- #archive legibility ---------------------------------------------------
console.log('\n#archive text legibility');
await page.evaluate(() => {
  const el = document.getElementById('archive');
  window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 90, behavior: 'instant' });
});
await page.waitForTimeout(700);
const cells = await page.evaluate(() => {
  const rows = document.querySelectorAll('#archive div.border-y > div.grid');
  return [...rows[1].children].map((c) => {
    const r = c.getBoundingClientRect();
    return { w: Math.round(r.width), opacity: getComputedStyle(c).opacity };
  });
});
ok('every archive cell fully opaque', cells.every((c) => c.opacity === '1'), cells.map((c) => c.opacity).join(','));
ok('no archive cell collapsed', cells.every((c) => c.w > 60), cells.map((c) => c.w).join(','));

// --- reduced motion gets the same thing ------------------------------------
console.log('\nreduced motion');
const rm = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await rm.emulateMedia({ reducedMotion: 'reduce' });
await rm.goto(BASE + '/', { waitUntil: 'networkidle' });
await rm.waitForTimeout(1200);
await rm.evaluate(() => {
  const el = document.getElementById('archive');
  window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 90, behavior: 'instant' });
});
await rm.waitForTimeout(500);
const rmState = await rm.evaluate(() => {
  const f = document.querySelector('.hero-parallax');
  return { display: getComputedStyle(f).display, bottom: Math.round(f.getBoundingClientRect().bottom) };
});
ok('portrait hidden from the lower sections', rmState.bottom <= 0, `display=${rmState.display} bottom=${rmState.bottom}`);
await rm.close();

await page.close();
await browser.close();
console.log(fails === 0 ? '\nALL GREEN' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);