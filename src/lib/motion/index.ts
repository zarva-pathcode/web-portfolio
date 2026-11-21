import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { initEngine } from './engine';
import { initReveals } from './reveals';
import { initOdometers } from './odometer';
import { initScramble } from './scramble';
import { initTactile } from './tactile';
import { initRail } from './rail';
import { initExperience } from './experience';
import { initWorkStage } from './workStage';
import { initFaq } from './faq';

let ctx: gsap.Context | null = null;
let cleanups: Array<() => void> = [];
let initialized = false;

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

  const stopEngine = initEngine();
  cleanups.push(stopEngine);

  ctx = gsap.context(() => {
    cleanups.push(initReveals());
    initOdometers();
    cleanups.push(initScramble());
    cleanups.push(initTactile());
    cleanups.push(initRail());
    cleanups.push(initExperience());
    cleanups.push(initWorkStage());
    cleanups.push(initFaq());
  });

  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
  });
}

// Astro View Transitions lifecycle
document.addEventListener('astro:before-swap', () => {
  document.documentElement.classList.add('is-swapping');
  teardownMotion();
});

document.addEventListener('astro:after-swap', () => {
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('is-swapping');
  });
});

document.addEventListener('astro:page-load', () => {
  bootMotion();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  queueMicrotask(() => {
    if (!initialized) bootMotion();
  });
}
