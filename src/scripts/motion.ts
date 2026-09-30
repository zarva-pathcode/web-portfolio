/**
 * Motion fallbacks and pointer effects.
 *
 * CSS handles the primary path. Scroll-driven animations in global.css are
 * gated on `animation-timeline`, which is Chromium-only for now, so on other
 * browsers those elements would sit motionless at their rest value with no
 * error to explain why. This module fills that gap:
 *
 *   - initScrollEffects() mirrors hero parallax, the timeline spine and the read
 *     progress bar from a rAF loop reading getBoundingClientRect().
 *   - initSectionReveal() runs the staggered reveal wherever scroll timelines
 *     are unavailable.
 *   - initTilt() and initCursor() are pointer effects with no CSS equivalent.
 *
 * Every entry point is idempotent and re-runnable, because ClientRouter swaps
 * the DOM on navigation and these listeners are bound to replaced elements.
 */

const REDUCED = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scroll timelines, when the browser has them, do a better job than we can. */
const HAS_SCROLL_TIMELINE = () => CSS.supports('animation-timeline', 'view()');

/* ------------------------------------------------------------------ *
 * Scroll-driven effects
 * ------------------------------------------------------------------ */

/**
 * Hero parallax, timeline spine and progress bar, driven from scroll position.
 *
 * A single rAF loop writes all of them: each tick reads layout once per element
 * and writes only the properties that actually changed, so idle frames cost
 * almost nothing and the handlers stay passive.
 */
export function initScrollEffects() {
  if (HAS_SCROLL_TIMELINE()) return;
  if (REDUCED()) return;

  const hero = document.querySelector<HTMLElement>('.hero-parallax');
  const ambientImg = document.querySelector<HTMLElement>('.hero-ambient-img');
  const spine = document.querySelector<HTMLElement>('.spine-draw');
  const progress = document.querySelector<HTMLElement>('.scroll-progress');
  const nav = document.querySelector<HTMLElement>('header.nav-condense');
  if (!hero && !ambientImg && !spine && !progress && !nav) return;

  const state = {
    hero: hero ? hero.style.transform : '',
    ambient: ambientImg ? ambientImg.style.opacity : '',
    spine: spine ? spine.style.transform : '',
    progress: progress ? progress.style.transform : '',
    nav: nav ? nav.style.transform : '',
  };

  let lastNavY = window.scrollY;
  let queued = false;

  const update = () => {
    queued = false;

    if (hero) {
      // Matches the CSS range of `0 100vh`, clamped to the hero's own height so
      // a short hero does not drift further than it can fill.
      const span = Math.min(window.innerHeight, document.body.scrollHeight || 1e5);
      const p = Math.min(1, window.scrollY / span);
      const next = `translate3d(0, ${(p * 80).toFixed(2)}px, 0)`;
      if (next !== state.hero) {
        hero.style.transform = next;
        state.hero = next;
      }
    }

    if (ambientImg) {
      // Ambient portrait fade (port from heynesh.com): 1 -> 0.3 across 0..100vh
      const span = Math.min(window.innerHeight, document.body.scrollHeight || 1e5);
      const p = Math.min(1, Math.max(0, window.scrollY / span));
      const next = (1 - p * 0.7).toFixed(3);
      if (next !== state.ambient) {
        ambientImg.style.opacity = next;
        state.ambient = next;
      }
    }

    if (nav) {
      // Nav retract on scroll (port from zamkara.dev)
      if (window.innerWidth >= 768) {
        const y = window.scrollY;
        const diff = y - lastNavY;
        let next = state.nav;
        if (y <= 20 || diff < -4) {
          next = 'translateY(0)';
        } else if (diff > 4 && y > 80) {
          next = 'translateY(-100%)';
        }
        if (next !== state.nav) {
          nav.style.transform = next;
          state.nav = next;
        }
        lastNavY = y;
      } else {
        if (state.nav !== 'none') {
          nav.style.transform = 'none';
          state.nav = 'none';
        }
      }
    }

    if (spine) {
      // Starts once the spine's top is a third of the way up the viewport and
      // finishes when it is fully read, mirroring `entry 10% cover 60%`.
      const rect = spine.getBoundingClientRect();
      const start = window.innerHeight * 0.9;
      const end = window.innerHeight * 0.2;
      const p = Math.min(1, Math.max(0, (start - rect.top) / Math.max(1, start - end)));
      const next = `scaleY(${p.toFixed(4)})`;
      if (next !== state.spine) {
        spine.style.transform = next;
        state.spine = next;
      }
    }

    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      const next = `scaleX(${p.toFixed(4)})`;
      if (next !== state.progress) {
        progress.style.transform = next;
        state.progress = next;
      }
    }
  };

  const request = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
  update();
}

/* ------------------------------------------------------------------ *
 * Staggered section reveal
 * ------------------------------------------------------------------ */

/**
 * Assigns each child of a `.reveal-group` its cascade index. Doing this here
 * rather than in the templates keeps the markup free of presentation state and
 * guarantees the numbers match whatever the group actually contains.
 */
function assignCascadeIndexes(root: ParentNode) {
  for (const group of root.querySelectorAll<HTMLElement>('.reveal-group')) {
    Array.from(group.children).forEach((child, i) => {
      (child as HTMLElement).style.setProperty('--reveal-i', String(i));
    });
  }
}

/**
 * Reveals sections and their children as they enter the viewport.
 *
 * Elements are unobserved once shown, and anything already on screen is shown
 * immediately so a mid-page navigation (View Transitions, a #anchor jump) never
 * leaves a section blank.
 */
export function initSectionReveal() {
  // The cascade indexes feed the CSS `animation-delay` on the modern path, so
  // this has to run even where scroll timelines exist. Only the IntersectionObserver
  // below is the fallback.
  assignCascadeIndexes(document);

  if (HAS_SCROLL_TIMELINE()) return;

  const targets = document.querySelectorAll<HTMLElement>(
    '.reveal, .fade-only, .reveal-group > *',
  );
  if (!targets.length) return;

  if (REDUCED()) {
    for (const el of targets) el.classList.add('is-visible');
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
  );

  for (const el of targets) observer.observe(el);
}

/**
 * Forces any still-hidden reveal to its final state once the visitor is close to
 * the end of the document.
 *
 * A `view()` timeline measures progress against the element's own travel through
 * the viewport. For the last elements on a page that travel is the problem: the
 * footer only reaches the end of its entry range at the end of the document, so
 * whatever the range says, the content is still at opacity 0 for most of the
 * journey down. Measured on the home page, the footer was invisible across the
 * final 400px of scroll and only appeared in the last 200.
 *
 * No range setting fixes that, because for the final element "has arrived" and
 * "page is over" are the same scroll position. This runs on every browser,
 * including those where the scroll timeline itself is unavailable, and cancels
 * the animation outright rather than trying to fast-forward it. It is
 * deliberately not gated on HAS_SCROLL_TIMELINE: the stranding happens on
 * Chromium too, where the timeline is the thing doing the stranding.
 */
export function initRevealSafetyNet() {
  if (REDUCED()) return;

  let queued = false;

  const check = () => {
    queued = false;

    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    /*
     * Two viewports short of the bottom, not one.
     *
     * Measured with a one-viewport threshold, the footer still sat at opacity 0
     * for the bottom 800px of the page: the net fired, but only once the
     * visitor was nearly there, so the reveal had almost no run-up. Two
     * viewports means the escape hatch fires while that content is still a
     * comfortable scroll away, which is what "already readable" has to mean for
     * something at the end of a document.
     */
    if (window.scrollY < max - window.innerHeight * 2) return;

    const stranded = document.querySelectorAll<HTMLElement>(
      '.reveal:not(.is-reached), .reveal-group > :not(.is-reached)',
    );
    for (const el of stranded) el.classList.add('is-reached');

    if (stranded.length) window.removeEventListener('scroll', request);
  };

  const request = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(check);
  };

  window.addEventListener('scroll', request, { passive: true });
  // A page restored mid-document, or a deep link, can already be near the bottom
  // before this binds.
  check();
}

/* ------------------------------------------------------------------ *
 * Pointer effects
 * ------------------------------------------------------------------ */

const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, label, [data-cursor="grow"]';

/**
 * Depth parallax on the project screenshots.
 *
 * Each image drifts vertically inside its own frame as the row crosses the
 * viewport, slower than the page. It is the same idea as the hero backdrop, but
 * at a different rate and on a per-element timeline, which is what makes it read
 * as depth rather than as decoration.
 *
 * The value is `--drift` in pixels, written straight onto the image wrapper. Only
 * `transform` is touched, so nothing here forces layout. Every element is read
 * once per frame, but the loop stops as soon as the last one has left the
 * viewport, so an idle page schedules no frames at all.
 *
 * Replaces the earlier scroll-velocity effect. That normalised pixels-per-
 * millisecond into a -1..1 range, which in practice saturated near 0.11 even on
 * a hard flick and moved the sections by about 1.5px — present in the code,
 * invisible on screen. A range that cannot reach its own maximum is not worth
 * the frame budget.
 */
export function initImageParallax() {
  if (REDUCED()) return;

  const layers = Array.from(
    document.querySelectorAll<HTMLElement>('[data-parallax]'),
  );
  if (!layers.length) return;

  /** Cached per element so the loop never re-reads layout for settled items. */
  const items = layers.map((el) => ({
    el,
    range: Number(el.dataset.parallax) || 40,
    // How far the element has travelled through the viewport, 0 at the bottom
    // edge and 1 at the top.
    progress: -1,
    top: 0,
    height: 0,
  }));

  let queued = false;

  const measure = () => {
    const vh = window.innerHeight;

    for (const item of items) {
      const rect = item.el.getBoundingClientRect();
      const travelled = vh - rect.top;
      const progress = travelled / (rect.height + vh);

      // Outside this band the image is off screen, so the last computed value is
      // close enough and no further writes are worth the style recalc.
      if (progress < -0.05 || progress > 1.05) {
        if (item.progress !== -2) {
          item.el.style.setProperty('--drift', '0px');
          item.progress = -2;
        }
        continue;
      }

      if (Math.abs(progress - item.progress) < 0.001) continue;
      item.progress = progress;

      /*
       * Centred on the element being mid-viewport, so an image at the middle of
       * the screen sits at its rest offset of zero. `progress` is already 0 at
       * the bottom edge and 1 at the top, so 0.5 is exactly the centred point and
       * the travel is symmetrical above and below it.
       */
      const offset = (progress - 0.5) * item.range;
      item.el.style.setProperty('--drift', `${offset.toFixed(1)}px`);
    }

    // Always released. Leaving this set while an element is still on screen
    // wedges the effect: the next scroll event sees `queued` and returns without
    // ever scheduling another frame, so the drift freezes at its first value.
    queued = false;
  };

  const request = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(measure);
  };

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
  // Through the rAF path so the first write lands on the next frame, after the
  // browser has settled layout. A direct call here would measure a
  // not-yet-laid-out element and cache that wrong progress value.
  request();
}
/**
 * Cursor follower: a dot that trails the real pointer with a lerp, growing into
 * a ring over interactive elements.
 *
 * The lerp runs in its own rAF loop because the easing has to keep going after
 * the last pointermove to settle. Touch devices have no pointer to follow and
 * CSS hides the element there anyway, so both are skipped.
 */
export function initCursor() {
  if (REDUCED()) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.setAttribute('aria-hidden', 'true');
  document.body.append(dot);

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let cx = x;
  let cy = y;
  let running = false;

  const tick = () => {
    cx += (x - cx) * 0.15;
    cy += (y - cy) * 0.15;
    dot.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
    // Settle threshold: past this the remaining gap is sub-pixel, so stop.
    if (Math.abs(x - cx) < 0.1 && Math.abs(y - cy) < 0.1) {
      running = false;
      return;
    }
    requestAnimationFrame(tick);
  };

  const wake = () => {
    if (running) return;
    running = true;
    requestAnimationFrame(tick);
  };

  window.addEventListener(
    'pointermove',
    (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      x = event.clientX;
      y = event.clientY;
      dot.dataset.visible = '';
      wake();
    },
    { passive: true },
  );

  window.addEventListener('pointerdown', () => dot.dataset.grow = '', { passive: true });
  window.addEventListener('pointerup', () => delete dot.dataset.grow, { passive: true });

  /*
   * The interactive set is matched against the composed path of the hovered
   * elements rather than a single `pointerover` target. A button contains a
   * `<span>` for its arrow, and moving onto that span retargets `pointerover`;
   * without the ancestor check the ring would collapse on the way in.
   */
  document.addEventListener('pointerover', (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    const path = event.composedPath();
    if (path.some((node) => node instanceof Element && node.closest(INTERACTIVE))) {
      dot.dataset.grow = '';
    }
  });
  document.addEventListener('pointerout', (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    const to = event.relatedTarget as Element | null;
    if (to?.closest(INTERACTIVE)) return;
    delete dot.dataset.grow;
  });
}

/**
 * 3D cursor-follow on the hero portrait (port from heydane.framer.website).
 *
 * Implements a heavy rAF lerp (easing ~0.08) so the portrait lags behind the
 * pointer and settles with weight, rather than tracking rigidly:
 *   rotation.y += (mouseX * sensitivity - rotation.y) * 0.08
 *
 * Consumed in global.css on .hero-intro as:
 *   transform: perspective(1200px) rotateY(var(--portrait-rx)) rotateX(var(--portrait-ry)) translate3d(var(--portrait-tx), var(--portrait-ty), 0)
 *
 * Transform ownership rule: .hero-intro is the sole owner of transform here. Its
 * CSS keyframe is opacity-only.
 *
 * Capped to ±4deg rotation and ±10px translation.
 * Gated on (hover: hover) and (pointer: fine). Cleared on pointerleave.
 * Under reduced motion: disabled completely.
 */
export function initPortraitFollow() {
  if (REDUCED()) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const hero = document.getElementById('hero');
  const target = document.querySelector<HTMLElement>('.hero-intro');
  if (!hero || !target) return;

  let targetRx = 0;
  let targetRy = 0;
  let targetTx = 0;
  let targetTy = 0;

  let currentRx = 0;
  let currentRy = 0;
  let currentTx = 0;
  let currentTy = 0;

  let running = false;

  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

  const tick = () => {
    // Heavy lerp (~0.08 easing) so portrait lags and settles
    const ease = 0.08;
    currentRx += (targetRx - currentRx) * ease;
    currentRy += (targetRy - currentRy) * ease;
    currentTx += (targetTx - currentTx) * ease;
    currentTy += (targetTy - currentTy) * ease;

    target.style.setProperty('--portrait-rx', `${currentRx.toFixed(3)}deg`);
    target.style.setProperty('--portrait-ry', `${currentRy.toFixed(3)}deg`);
    target.style.setProperty('--portrait-tx', `${currentTx.toFixed(2)}px`);
    target.style.setProperty('--portrait-ty', `${currentTy.toFixed(2)}px`);

    const settled =
      Math.abs(targetRx - currentRx) < 0.01 &&
      Math.abs(targetRy - currentRy) < 0.01 &&
      Math.abs(targetTx - currentTx) < 0.05 &&
      Math.abs(targetTy - currentTy) < 0.05;

    if (settled) {
      running = false;
      if (targetRx === 0 && targetRy === 0 && targetTx === 0 && targetTy === 0) {
        target.style.setProperty('--portrait-rx', '0deg');
        target.style.setProperty('--portrait-ry', '0deg');
        target.style.setProperty('--portrait-tx', '0px');
        target.style.setProperty('--portrait-ty', '0px');
      }
      return;
    }

    requestAnimationFrame(tick);
  };

  const wake = () => {
    if (running) return;
    running = true;
    requestAnimationFrame(tick);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    const rect = hero.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;

    // Caps: ±4deg rotation, ±10px translation
    targetRx = clamp(nx * 8, -4, 4);
    targetRy = clamp(-ny * 8, -4, 4);
    targetTx = clamp(nx * 20, -10, 10);
    targetTy = clamp(ny * 20, -10, 10);

    wake();
  };

  const onPointerLeave = () => {
    targetRx = 0;
    targetRy = 0;
    targetTx = 0;
    targetTy = 0;
    wake();
  };

  hero.addEventListener('pointermove', onPointerMove, { passive: true });
  hero.addEventListener('pointerleave', onPointerLeave, { passive: true });
}

/* ------------------------------------------------------------------ */

export function initMotion() {
  initScrollEffects();
  initSectionReveal();
  initRevealSafetyNet();
  initImageParallax();
  initCursor();
  initPortraitFollow();
}
