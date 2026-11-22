import gsap from 'gsap';
import { isReducedMotion } from './engine';

interface BeforePrepEvent extends Event {
  from: URL;
  to: URL;
  loader: () => Promise<void>;
}

declare global {
  interface Window {
    __zarvaCurtainBound?: boolean;
  }
}

const MIN_COVER_MS = 380;
const WATCHDOG_MS = 3000;

interface RouteDescriptor {
  kicker: string;
  title: string;
}

function formatSlugTitle(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function resolveRouteDescriptor(pathname: string): RouteDescriptor {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const isId = clean === '/id' || clean.startsWith('/id/');
  const bare = isId ? clean.slice(3) || '/' : clean;

  if (bare === '/') {
    return isId
      ? { kicker: '01 · BERANDA', title: 'Zarvaism' }
      : { kicker: '01 · HOME', title: 'Zarvaism' };
  }
  if (bare === '/cv') {
    return isId
      ? { kicker: 'ZARVAISM · CV', title: 'Daftar Riwayat Hidup' }
      : { kicker: 'ZARVAISM · CV', title: 'Curriculum Vitae' };
  }
  if (bare === '/blog') {
    return isId
      ? { kicker: 'ZARVAISM · CATATAN', title: 'Tulisan' }
      : { kicker: 'ZARVAISM · NOTES', title: 'Writing' };
  }
  if (bare.startsWith('/blog/')) {
    const slug = bare.slice('/blog/'.length).split('/')[0] || '';
    return isId
      ? { kicker: 'ARTIKEL', title: slug ? formatSlugTitle(slug) : 'Artikel' }
      : { kicker: 'ARTICLE', title: slug ? formatSlugTitle(slug) : 'Article' };
  }
  if (bare.startsWith('/projects/')) {
    const slug = bare.slice('/projects/'.length).split('/')[0] || '';
    return isId
      ? { kicker: '05 · STUDI KASUS', title: slug ? formatSlugTitle(slug) : 'Studi Kasus' }
      : { kicker: '05 · CASE STUDY', title: slug ? formatSlugTitle(slug) : 'Case Study' };
  }

  const tail = bare.split('/').filter(Boolean).pop() || '';
  return {
    kicker: 'ZARVAISM',
    title: tail ? formatSlugTitle(tail) : isId ? 'Halaman' : 'Page',
  };
}

export function initRouteCurtain(): void {
  if (typeof window === 'undefined' || window.__zarvaCurtainBound) return;
  window.__zarvaCurtainBound = true;

  let covering = false;
  let watchdogId = 0;

  const getNodes = () => {
    const curtain = document.getElementById('route-curtain');
    if (!curtain) return null;
    return {
      curtain,
      bladeLeft: curtain.querySelector<HTMLElement>('[data-curtain-blade-left]'),
      bladeRight: curtain.querySelector<HTMLElement>('[data-curtain-blade-right]'),
      left: curtain.querySelector<HTMLElement>('[data-curtain-left]'),
      right: curtain.querySelector<HTMLElement>('[data-curtain-right]'),
      seam: curtain.querySelector<HTMLElement>('[data-curtain-seam]'),
      center: curtain.querySelector<HTMLElement>('[data-curtain-center]'),
      kicker: curtain.querySelector<HTMLElement>('[data-curtain-kicker]'),
      meta: curtain.querySelector<HTMLElement>('[data-curtain-meta]'),
      route: curtain.querySelector<HTMLElement>('[data-curtain-route]'),
      line: curtain.querySelector<HTMLElement>('[data-curtain-line]'),
    };
  };

  const clearWatchdog = () => {
    if (watchdogId) {
      window.clearTimeout(watchdogId);
      watchdogId = 0;
    }
  };

  const allAnimated = (nodes: NonNullable<ReturnType<typeof getNodes>>) =>
    [
      nodes.curtain,
      nodes.bladeLeft,
      nodes.bladeRight,
      nodes.left,
      nodes.right,
      nodes.seam,
      nodes.kicker,
      nodes.route,
      nodes.line,
    ].filter(Boolean);

  const resetImmediate = () => {
    clearWatchdog();
    covering = false;
    const nodes = getNodes();
    if (!nodes) return;
    gsap.killTweensOf(allAnimated(nodes));
    gsap.set(nodes.curtain, {
      visibility: 'hidden',
      opacity: 0,
      pointerEvents: 'none',
    });
    if (nodes.bladeLeft) gsap.set(nodes.bladeLeft, { xPercent: -102 });
    if (nodes.bladeRight) gsap.set(nodes.bladeRight, { xPercent: 102 });
    if (nodes.left) gsap.set(nodes.left, { xPercent: -102 });
    if (nodes.right) gsap.set(nodes.right, { xPercent: 102 });
    if (nodes.seam) gsap.set(nodes.seam, { scaleY: 0, opacity: 0 });
    if (nodes.kicker) gsap.set(nodes.kicker, { yPercent: 115, opacity: 0 });
    if (nodes.route) gsap.set(nodes.route, { yPercent: 115, opacity: 0 });
    if (nodes.line) gsap.set(nodes.line, { scaleX: 0, opacity: 0 });
  };

  const openDoors = () => {
    clearWatchdog();
    if (!covering) return;
    const nodes = getNodes();
    if (!nodes) {
      covering = false;
      return;
    }

    gsap.killTweensOf(allAnimated(nodes));

    const tl = gsap.timeline({
      delay: 0.08,
      onComplete: () => {
        resetImmediate();
      },
    });

    // Exit masked typography cleanly upward before the two doors part
    if (nodes.kicker) {
      tl.to(nodes.kicker, { yPercent: -115, opacity: 0, duration: 0.22, ease: 'power3.in' }, 0);
    }
    if (nodes.route) {
      tl.to(nodes.route, { yPercent: -115, opacity: 0, duration: 0.24, ease: 'power3.in' }, 0.03);
    }
    if (nodes.line) {
      tl.to(nodes.line, { scaleX: 0, opacity: 0, duration: 0.2, ease: 'power2.in' }, 0);
    }
    if (nodes.seam) {
      tl.to(nodes.seam, { opacity: 0, duration: 0.14, ease: 'power2.out' }, 0.14);
    }
    if (nodes.center) {
      tl.to(nodes.center, { opacity: 0, duration: 0.12, ease: 'power2.out' }, 0.14);
    }

    // Split primary doors open left & right, with trailing depth blades for tactile motion
    if (nodes.left) {
      tl.to(nodes.left, { xPercent: -102, duration: 0.54, ease: 'power4.inOut' }, 0.14);
    }
    if (nodes.right) {
      tl.to(nodes.right, { xPercent: 102, duration: 0.54, ease: 'power4.inOut' }, 0.14);
    }
    if (nodes.bladeLeft) {
      tl.to(nodes.bladeLeft, { xPercent: -102, duration: 0.58, ease: 'power4.inOut' }, 0.19);
    }
    if (nodes.bladeRight) {
      tl.to(nodes.bladeRight, { xPercent: 102, duration: 0.58, ease: 'power4.inOut' }, 0.19);
    }
  };

  document.addEventListener('astro:before-preparation', (rawEvent) => {
    const event = rawEvent as BeforePrepEvent;
    if (isReducedMotion()) {
      resetImmediate();
      return;
    }

    const fromPath = event.from?.pathname || window.location.pathname;
    const toPath = event.to?.pathname || '';
    if (!toPath || toPath === fromPath || toPath.startsWith('/admin')) {
      return;
    }

    const nodes = getNodes();
    if (!nodes) return;

    clearWatchdog();
    covering = true;
    gsap.killTweensOf(allAnimated(nodes));

    const desc = resolveRouteDescriptor(toPath);
    if (nodes.meta) nodes.meta.textContent = desc.kicker;
    if (nodes.route) nodes.route.textContent = desc.title;

    gsap.set(nodes.curtain, {
      visibility: 'visible',
      opacity: 1,
      pointerEvents: 'auto',
    });
    if (nodes.bladeLeft) gsap.set(nodes.bladeLeft, { xPercent: -102 });
    if (nodes.bladeRight) gsap.set(nodes.bladeRight, { xPercent: 102 });
    if (nodes.left) gsap.set(nodes.left, { xPercent: -102 });
    if (nodes.right) gsap.set(nodes.right, { xPercent: 102 });
    if (nodes.seam) gsap.set(nodes.seam, { scaleY: 0, opacity: 0.85, transformOrigin: '50% 50%' });
    if (nodes.center) gsap.set(nodes.center, { opacity: 1 });
    if (nodes.kicker) gsap.set(nodes.kicker, { yPercent: 115, opacity: 0 });
    if (nodes.route) gsap.set(nodes.route, { yPercent: 115, opacity: 0 });
    if (nodes.line) gsap.set(nodes.line, { scaleX: 0, opacity: 1 });

    // Close the two opposing doors with staggered leading depth blades
    const closeTl = gsap.timeline();
    if (nodes.bladeLeft) {
      closeTl.to(nodes.bladeLeft, { xPercent: 0, duration: 0.34, ease: 'power4.out' }, 0);
    }
    if (nodes.bladeRight) {
      closeTl.to(nodes.bladeRight, { xPercent: 0, duration: 0.34, ease: 'power4.out' }, 0);
    }
    if (nodes.left) {
      closeTl.to(nodes.left, { xPercent: 0, duration: 0.36, ease: 'power4.out' }, 0.045);
    }
    if (nodes.right) {
      closeTl.to(nodes.right, { xPercent: 0, duration: 0.36, ease: 'power4.out' }, 0.045);
    }
    if (nodes.seam) {
      closeTl.to(nodes.seam, { scaleY: 1, duration: 0.24, ease: 'expo.out' }, 0.24);
    }
    if (nodes.kicker) {
      closeTl.to(nodes.kicker, { yPercent: 0, opacity: 1, duration: 0.32, ease: 'expo.out' }, 0.18);
    }
    if (nodes.route) {
      closeTl.to(nodes.route, { yPercent: 0, opacity: 1, duration: 0.36, ease: 'expo.out' }, 0.22);
    }
    if (nodes.line) {
      closeTl.to(nodes.line, { scaleX: 1, duration: 0.36, ease: 'power3.out' }, 0.22);
    }

    watchdogId = window.setTimeout(() => {
      if (covering) openDoors();
    }, WATCHDOG_MS);

    const originalLoader = event.loader;
    event.loader = async () => {
      const minWait = new Promise<void>((resolve) => window.setTimeout(resolve, MIN_COVER_MS));
      try {
        await Promise.all([originalLoader(), minWait]);
      } catch (err) {
        resetImmediate();
        throw err;
      }
    };
  });

  document.addEventListener('astro:page-load', () => {
    if (covering) {
      openDoors();
    }
  });
}
