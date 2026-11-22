import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { initEngine } from './engine';
import { initReveals } from './reveals';
import { initOdometers } from './odometer';
import { initHeroLens } from './heroLens';
import { initScramble } from './scramble';
import { initTactile } from './tactile';
import { initRail } from './rail';
import { initExperience } from './experience';
import { initWorkStage } from './workStage';
import { initFaq } from './faq';
import { initFooterAmbient } from './footerAmbient';
import { initRouteCurtain } from './routeCurtain';

declare global {
  interface Window {
    __zarvaMotionBooted?: boolean;
    __zarvaBootCount?: number;
  }
}

let ctx: gsap.Context | null = null;
let cleanups: Array<() => void> = [];
let initialized = false;
let bootedForCurrentDocument = false;

export function teardownMotion(): void {
  cleanups.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore teardown edge errors
    }
  });
  cleanups = [];

  if (ctx) {
    ctx.revert();
    ctx = null;
  }

  ScrollTrigger.getAll().forEach((st) => st.kill());
  initialized = false;
}

export function bootMotion(): void {
  if (initialized) teardownMotion();
  initialized = true;
  bootedForCurrentDocument = true;
  window.__zarvaMotionBooted = true;
  window.__zarvaBootCount = (window.__zarvaBootCount || 0) + 1;

  initRouteCurtain();
  const stopEngine = initEngine();
  cleanups.push(stopEngine);

  ctx = gsap.context(() => {
    cleanups.push(initReveals());
    initOdometers();
    cleanups.push(initHeroLens());
    cleanups.push(initScramble());
    cleanups.push(initTactile());
    cleanups.push(initRail());
    cleanups.push(initExperience());
    cleanups.push(initWorkStage());
    cleanups.push(initFaq());
    cleanups.push(initFooterAmbient());
  });

  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
  });
}

// Astro View Transitions lifecycle — guarantees exactly ONE boot per page load / swap (no double-mount glitch!)
document.addEventListener('astro:before-swap', () => {
  document.documentElement.classList.add('is-swapping');
  bootedForCurrentDocument = false;
  teardownMotion();
});

document.addEventListener('astro:after-swap', () => {
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('is-swapping');
  });
});

document.addEventListener('astro:page-load', () => {
  if (!bootedForCurrentDocument) {
    bootMotion();
  }
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  queueMicrotask(() => {
    if (!bootedForCurrentDocument) bootMotion();
  });
}
