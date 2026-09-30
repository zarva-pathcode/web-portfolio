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

/** Rows that should lift toward the pointer as a grid. */
const TILT_SELECTOR = '.tilt';

/**
 * 3D tilt on the featured-project rows.
 *
 * `--tilt-x` / `--tilt-y` are written per pointer move and the transform is
 * declared in global.css, so resetting is just clearing the two properties; the
 * CSS transition eases the card back on its own. Scaled to 16deg because these
 * are full-width rows: a fraction of the row's width is a small fraction of a
 * large distance, so the angle has to be large to read at all.
 */
export function initTilt() {
  if (REDUCED()) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  for (const el of document.querySelectorAll<HTMLElement>(TILT_SELECTOR)) {
    if (el.dataset.tiltBound) continue;
    el.dataset.tiltBound = '';

    el.addEventListener('pointerenter', () => el.dataset.active = '');
    el.addEventListener('pointerleave', () => {
      delete el.dataset.active;
      delete el.dataset.hot;
      el.style.setProperty('--tilt-x', '0deg');
      el.style.setProperty('--tilt-y', '0deg');
    });
    el.addEventListener('pointermove', (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty('--tilt-x', `${(-ny * 16).toFixed(2)}deg`);
      el.style.setProperty('--tilt-y', `${(nx * 16).toFixed(2)}deg`);
      el.dataset.hot = '';
    });
  }
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
  initTilt();
  initCursor();
}
