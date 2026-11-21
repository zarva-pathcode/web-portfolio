import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

declare global {
  interface Window {
    __zarvaLenis?: Lenis | null;
  }
}

let registered = false;
let lenisInstance: Lenis | null = null;
let tickerCb: ((time: number) => void) | null = null;

export function isReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function prefersFinePointer(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)').matches
  );
}

export function getLenis(): Lenis | null {
  return lenisInstance;
}

function resolveTargetY(target: string | number | HTMLElement): number | null {
  if (typeof target === 'number') return Math.max(0, Math.round(target));
  const el =
    typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return null;
  return Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY));
}

export function scrollToTarget(target: string | number | HTMLElement): void {
  const targetY = resolveTargetY(target);
  if (targetY === null) return;

  if (isReducedMotion() || !lenisInstance) {
    window.scrollTo({ top: targetY, behavior: 'auto' });
    return;
  }

  lenisInstance.scrollTo(targetY, {
    duration: 0.78,
    force: true,
  });
}

function destroyLenis(): void {
  if (tickerCb) {
    gsap.ticker.remove(tickerCb);
    tickerCb = null;
  }
  if (lenisInstance) {
    lenisInstance.destroy();
    lenisInstance = null;
  }
  window.__zarvaLenis = null;
  document.documentElement.classList.remove('lenis', 'lenis-smooth');
}

function createLenis(): void {
  destroyLenis();
  if (isReducedMotion()) return;

  const lenis = new Lenis({
    duration: 0.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.5,
  });

  lenis.on('scroll', ScrollTrigger.update);

  tickerCb = (time: number) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(tickerCb);
  gsap.ticker.lagSmoothing(0);

  lenisInstance = lenis;
  window.__zarvaLenis = lenis;
}

export function initEngine(): () => void {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.config({ nullTargetWarn: false });
    ScrollTrigger.config({ ignoreMobileResize: true });
    registered = true;
  }

  createLenis();

  // Capture-phase anchor interception so Astro ClientRouter never hijacks same-page #hash jumps
  const onAnchorClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const target = e.target as HTMLElement | null;
    const anchor = target?.closest<HTMLAnchorElement>('a[href*="#"]');
    if (!anchor || anchor.target === '_blank') return;

    const url = new URL(anchor.href, window.location.href);
    const samePath =
      url.pathname.replace(/\/$/, '') === window.location.pathname.replace(/\/$/, '');
    if (!samePath || !url.hash || url.hash === '#') return;

    const dest = document.querySelector<HTMLElement>(url.hash);
    if (!dest) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    // Release focus on pointer click so rail hover tooltips don't stay stuck over page copy
    if (e.detail > 0) {
      anchor.blur();
    }

    scrollToTarget(dest);
    if (history.replaceState) {
      history.replaceState(null, '', url.hash);
    }
  };

  document.addEventListener('click', onAnchorClick, true);

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMotionChange = () => {
    if (mq.matches) {
      destroyLenis();
      document
        .querySelectorAll('[data-reveal], [data-split], [data-stagger]')
        .forEach((el) => el.classList.add('is-in'));
    } else {
      createLenis();
    }
    ScrollTrigger.refresh();
  };
  mq.addEventListener('change', onMotionChange);

  return () => {
    document.removeEventListener('click', onAnchorClick, true);
    mq.removeEventListener('change', onMotionChange);
    destroyLenis();
  };
}
