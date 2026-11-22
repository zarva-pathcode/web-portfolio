import { chromium } from 'playwright';

const BASE = 'http://localhost:4322';
const ARTIFACTS = 'C:/Users/FUJITSU/.gemini/antigravity-cli/brain/db74d77f-7fb6-453e-aa9a-1117e4ea1de8';

let browser;
for (const opts of [{ channel: 'chrome' }, { channel: 'msedge' }, {}]) {
  try {
    browser = await chromium.launch(opts);
    break;
  } catch {}
}
if (!browser) throw new Error('No Chromium browser available');

let fails = 0;
const errors = [];
const ok = (label, pass, detail = '') => {
  if (!pass) fails++;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
};

const sampleHeroCanvas = (page, region = null) =>
  page.evaluate((reg) => {
    const c = document.querySelector('[data-hero-canvas]');
    if (!c) return null;
    const ctx = c.getContext('2d');
    const sx = reg ? Math.max(0, Math.round(reg.x)) : 0;
    const sy = reg ? Math.max(0, Math.round(reg.y)) : 0;
    const sw = reg ? Math.min(c.width - sx, Math.round(reg.w)) : c.width;
    const sh = reg ? Math.min(c.height - sy, Math.round(reg.h)) : c.height;
    if (sw <= 0 || sh <= 0) return { width: c.width, height: c.height, nonZero: 0, hash: 0 };
    const data = ctx.getImageData(sx, sy, sw, sh).data;
    let nonZero = 0;
    let hash = 0;
    const step = reg ? 16 : 64;
    for (let i = 3; i < data.length; i += step) {
      if (data[i] > 0) nonZero++;
      hash = (hash * 31 + data[i] + data[i - 3] + data[i - 2]) >>> 0;
    }
    return { width: c.width, height: c.height, nonZero, hash };
  }, region);

try {
  // 1. Desktop 2x DPR (Review Focus #1, #2, #3, #5 + Moments 1, 2, 3 + Theme toggle)
  console.log('\n[Desktop 1440x900 @ 2x DPR]');
  const ctx2x = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx2x.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`desktop console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`desktop pageerror: ${e.message}`));

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(180);
  const earlySample = await sampleHeroCanvas(page);

  await page.waitForTimeout(1900);
  const settledSample = await sampleHeroCanvas(page);

  ok(
    'canvas sized for 2x DPR & draws portrait',
    settledSample && settledSample.width > 2000 && settledSample.nonZero > 500,
    settledSample ? `${settledSample.width}x${settledSample.height} nonZero=${settledSample.nonZero}` : 'null'
  );
  ok(
    'Moment 1 load exposure animates canvas',
    earlySample && settledSample && earlySample.hash !== settledSample.hash,
    `early=${earlySample?.hash} settled=${settledSample?.hash}`
  );

  // Accent span preserved + aria-label intact
  const h1Check = await page.evaluate(() => {
    const h1 = document.querySelector('#hero h1');
    const accentWords = Array.from(document.querySelectorAll('#hero h1 .word-inner.text-brand')).map(
      (el) => el.textContent
    );
    return {
      aria: h1?.getAttribute('aria-label') || '',
      accentWords,
      isIn: h1?.classList.contains('is-in'),
    };
  });
  const enAccent = h1Check.accentWords.join(' ').trim();
  ok(
    'accent span preserved inside EN headline',
    h1Check.isIn && h1Check.accentWords.length > 0 && h1Check.aria.includes(enAccent),
    JSON.stringify(h1Check)
  );

  await page.screenshot({ path: `${ARTIFACTS}/verify-v10-hero-desktop-paper.png` });

  // Right-edge feather check: far-right 2px strip stays feathered (alpha <= 12) so no hard seam appears on parallax or >1440px screens
  const rightEdgeMaxAlpha = await page.evaluate(() => {
    const c = document.querySelector('[data-hero-canvas]');
    const ctx = c.getContext('2d');
    const data = ctx.getImageData(c.width - 2, 0, 2, c.height).data;
    let maxA = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > maxA) maxA = data[i];
    return maxA;
  });
  ok(
    'desktop right edge feathers cleanly to transparent (no parallax/ultrawide seam)',
    rightEdgeMaxAlpha <= 12,
    `rightEdgeMaxAlpha=${rightEdgeMaxAlpha}`
  );

  // Moment 2: Sweep cursor across portrait at 2x DPR (verify kinetic fluid wake, hint dismissed & bespoke custom cursor active)
  const canvasBox = await page.locator('[data-hero-canvas]').boundingBox();
  const hoverX = Math.round(canvasBox.x + canvasBox.width * 0.72);
  const hoverY = Math.round(canvasBox.y + canvasBox.height * 0.45);
  const localRegion = {
    x: (hoverX - canvasBox.x - 80) * 2,
    y: (hoverY - canvasBox.y - 80) * 2,
    w: 320,
    h: 320,
  };
  const beforeHover = await sampleHeroCanvas(page, localRegion);
  await page.mouse.move(hoverX - 120, hoverY + 70);
  await page.mouse.move(hoverX, hoverY, { steps: 12 });
  await page.waitForTimeout(90);
  const afterHover = await sampleHeroCanvas(page, localRegion);
  const cursorCheck = await page.evaluate(() => ({
    hintDismissed: document.querySelector('[data-hero-lens-hint]')?.getAttribute('data-dismissed') === 'true',
    hasCustomClass: document.documentElement.classList.contains('has-custom-cursor'),
    cursorActive: document.getElementById('custom-cursor')?.getAttribute('data-active') === 'true',
    cursorState: document.getElementById('custom-cursor')?.getAttribute('data-state') || '',
  }));
  ok(
    'Moment 2 cursor fluid wake changes pixels under pointer @ 2x DPR',
    beforeHover.hash !== afterHover.hash,
    `before=${beforeHover.hash} after=${afterHover.hash}`
  );
  ok(
    'custom editorial cursor active & portrait reticle engaged',
    cursorCheck.hasCustomClass && cursorCheck.cursorActive && cursorCheck.cursorState === 'portrait',
    JSON.stringify(cursorCheck)
  );
  ok('desktop hover lens hint dismisses on first hover', cursorCheck.hintDismissed);
  await page.screenshot({ path: `${ARTIFACTS}/verify-v10-hero-desktop-lens.png` });

  // Move mouse away & switch to Night theme
  await page.mouse.move(20, 20);
  await page.waitForTimeout(450);
  const paperSettled = await sampleHeroCanvas(page);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'night'));
  await page.waitForTimeout(200);
  const nightSettled = await sampleHeroCanvas(page);
  ok('Night theme toggle repaints canvas immediately', paperSettled.hash !== nightSettled.hash);
  await page.screenshot({ path: `${ARTIFACTS}/verify-v10-hero-desktop-night.png` });

  // Moment 3: Desktop scroll dispersion & reverse on scroll back up
  await page.evaluate(() => window.scrollTo(0, 420));
  await page.waitForTimeout(350);
  const midScrollCanvas = await sampleHeroCanvas(page);
  const midCopyOpacity = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.querySelector('[data-hero-copy]')).opacity)
  );
  ok(
    'Moment 3 desktop scroll disperses portrait & softly fades copy',
    midScrollCanvas.hash !== nightSettled.hash && midCopyOpacity < 0.9 && midCopyOpacity >= 0.25,
    `copyOpacity=${midCopyOpacity.toFixed(2)}`
  );
  await page.screenshot({ path: `${ARTIFACTS}/verify-v10-hero-desktop-scroll.png` });

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(350);
  const restoredOpacity = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.querySelector('[data-hero-copy]')).opacity)
  );
  ok('scroll back to top restores copy opacity to 1', restoredOpacity >= 0.98, `opacity=${restoredOpacity}`);

  // Offscreen idle sleep check (scroll to #contact)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  const off0 = await sampleHeroCanvas(page);
  await page.waitForTimeout(600);
  const off1 = await sampleHeroCanvas(page);
  ok('hero canvas sleeps when offscreen', off0.hash === off1.hash);

  // View Transitions round-trip (/ -> /cv -> /) & session revisit flag
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.click('#hero a[href="/cv"]');
  await page.waitForURL('**/cv');
  await page.waitForTimeout(350);
  await page.goBack();
  await page.waitForURL(`${BASE}/`);
  await page.waitForTimeout(750);
  const vtSample = await sampleHeroCanvas(page);
  const seenFlag = await page.evaluate(() => window.sessionStorage.getItem('zarvaism:hero-seen'));
  ok(
    'View Transitions round-trip re-initializes hero cleanly with revisit flag',
    vtSample && vtSample.nonZero > 500 && seenFlag === '1',
    `nonZero=${vtSample?.nonZero} seen=${seenFlag}`
  );

  // Indonesian locale accent check (/id)
  await page.goto(`${BASE}/id`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const idCheck = await page.evaluate(() => {
    const h1 = document.querySelector('#hero h1');
    const accent = Array.from(document.querySelectorAll('#hero h1 .word-inner.text-brand')).map(
      (el) => el.textContent
    );
    return { aria: h1?.getAttribute('aria-label') || '', accentText: accent.join(' ').trim(), count: accent.length };
  });
  ok(
    'ID locale preserves clay accent span',
    idCheck.count > 0 && idCheck.aria.includes(idCheck.accentText),
    idCheck.accentText
  );

  await ctx2x.close();

  // 2. Early scroll skip during intro (Review Focus #4)
  console.log('\n[Early Scroll Skip]');
  const skipCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const skipPage = await skipCtx.newPage();
  skipPage.on('pageerror', (e) => errors.push(`skip pageerror: ${e.message}`));
  await skipPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await skipPage.waitForTimeout(160);
  await skipPage.evaluate(() => window.scrollTo(0, 180));
  await skipPage.waitForTimeout(300);
  const skipState = await skipPage.evaluate(() => {
    const h1 = document.querySelector('#hero h1');
    const sub = document.querySelector('[data-hero-sub]');
    return {
      isIn: h1?.classList.contains('is-in'),
      subOpacity: parseFloat(getComputedStyle(sub).opacity),
    };
  });
  ok(
    'early scroll past 24px fast-forwards intro cleanly',
    skipState.isIn && skipState.subOpacity > 0.95,
    JSON.stringify(skipState)
  );
  await skipCtx.close();

  // 3. Mobile 390x844 layout, touch bloom & zero copy fade on scroll
  console.log('\n[Mobile 390x844]');
  const mobCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const mobPage = await mobCtx.newPage();
  mobPage.on('console', (m) => {
    if (m.type() === 'error') errors.push(`mobile console.error: ${m.text()}`);
  });
  mobPage.on('pageerror', (e) => errors.push(`mobile pageerror: ${e.message}`));

  await mobPage.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await mobPage.waitForTimeout(1800);

  const mobLayout = await mobPage.evaluate(() => {
    const wrap = document.querySelector('[data-hero-canvas-wrap]').getBoundingClientRect();
    const cta = document.querySelector('[data-hero-cta]').getBoundingClientRect();
    const hint = getComputedStyle(document.querySelector('[data-hero-lens-hint]')).display;
    return {
      portraitTop: Math.round(wrap.top),
      portraitBottom: Math.round(wrap.bottom),
      ctaBottom: Math.round(cta.bottom),
      hintDisplay: hint,
    };
  });
  ok(
    'mobile portrait + primary CTAs sit cleanly above bottom dock (< 785px)',
    mobLayout.portraitBottom < 420 && mobLayout.ctaBottom < 785 && mobLayout.hintDisplay === 'none',
    JSON.stringify(mobLayout)
  );
  await mobPage.screenshot({ path: `${ARTIFACTS}/verify-v10-hero-mobile-paper.png` });

  // Mobile at scrollY=0: portrait halftone dots are crisp in center patch (not prematurely dispersed)
  const mobAtRestCenter = await mobPage.evaluate(() => {
    const c = document.querySelector('[data-hero-canvas]');
    const ctx = c.getContext('2d');
    const data = ctx.getImageData(Math.round(c.width * 0.35), Math.round(c.height * 0.25), Math.round(c.width * 0.3), Math.round(c.height * 0.5)).data;
    let nonZero = 0;
    for (let i = 3; i < data.length; i += 16) if (data[i] > 80) nonZero++;
    return nonZero;
  });
  ok(
    'mobile portrait halftone renders densely at scrollY=0',
    mobAtRestCenter > 400,
    `centerDots=${mobAtRestCenter}`
  );

  // Mobile scroll disperses portrait without fading copy
  const mobBeforeScroll = await sampleHeroCanvas(mobPage);
  await mobPage.evaluate(() => window.scrollTo(0, 180));
  await mobPage.waitForTimeout(300);
  const mobAfterScroll = await sampleHeroCanvas(mobPage);
  const mobCopyOpacity = await mobPage.evaluate(() =>
    parseFloat(getComputedStyle(document.querySelector('[data-hero-copy]')).opacity)
  );
  ok(
    'mobile scroll disperses portrait while keeping copy 100% opaque',
    mobBeforeScroll.hash !== mobAfterScroll.hash && mobCopyOpacity === 1,
    `copyOpacity=${mobCopyOpacity}`
  );

  // Mobile Night screenshot
  await mobPage.evaluate(() => {
    window.scrollTo(0, 0);
    document.documentElement.setAttribute('data-theme', 'night');
  });
  await mobPage.waitForTimeout(300);
  await mobPage.screenshot({ path: `${ARTIFACTS}/verify-v10-hero-mobile-night.png` });
  await mobCtx.close();

  // 4. Reduced motion check
  console.log('\n[Reduced Motion]');
  const rmCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const rmPage = await rmCtx.newPage();
  rmPage.on('pageerror', (e) => errors.push(`rm pageerror: ${e.message}`));
  await rmPage.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await rmPage.evaluate(() => document.fonts?.ready);
  await rmPage.waitForTimeout(450);
  const rmMeta = await rmPage.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const samplePatch = () =>
    rmPage.evaluate(() => {
      const c = document.querySelector('[data-hero-canvas]');
      const ctx = c.getContext('2d');
      const d = ctx.getImageData(920, 340, 180, 180).data;
      let nonZero = 0;
      const out = [];
      for (let i = 0; i < d.length; i += 32) {
        if (d[i + 3] > 0) nonZero++;
        out.push(d[i], d[i + 1], d[i + 2], d[i + 3]);
      }
      return { nonZero, out };
    });
  // Warm initial GPU->CPU readback once, then verify hover causes zero pixel movement
  await samplePatch();
  const rm0 = await samplePatch();
  const rmCopyOp = await rmPage.evaluate(() =>
    parseFloat(getComputedStyle(document.querySelector('[data-hero-copy]')).opacity)
  );
  await rmPage.mouse.move(1050, 420, { steps: 6 });
  await rmPage.waitForTimeout(400);
  const rm1 = await samplePatch();
  let maxDelta = 0;
  for (let i = 0; i < rm0.out.length; i++) {
    const diff = Math.abs(rm0.out[i] - rm1.out[i]);
    if (diff > maxDelta) maxDelta = diff;
  }
  ok(
    'reduced motion renders crisp portrait immediately with zero hover animation',
    rmMeta && rm0.nonZero > 200 && maxDelta === 0 && rmCopyOp === 1,
    `rm=${rmMeta} patchNonZero=${rm0.nonZero} maxDelta=${maxDelta} copyOp=${rmCopyOp}`
  );
  await rmCtx.close();

  ok('zero console/page errors across all scenarios', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
}

console.log(fails === 0 ? '\nALL HERO LENS CHECKS PASSED' : `\n${fails} CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
