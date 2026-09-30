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
  const spine = document.querySelector<HTMLElement>('.spine-draw');
  const progress = document.querySelector<HTMLElement>('.scroll-progress');
  if (!hero && !spine && !progress) return;

  const state = {
    hero: hero ? hero.style.transform : '',
    spine: spine ? spine.style.transform : '',
    progress: progress ? progress.style.transform : '',
  };

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

/* ------------------------------------------------------------------ */

export function initMotion() {
  initScrollEffects();
  initSectionReveal();
  initImageParallax();
  initCursor();
}
