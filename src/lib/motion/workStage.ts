import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { isReducedMotion } from './engine';
import { createLiveOdometer } from './odometer';

export function initWorkStage(): () => void {
  const section = document.querySelector<HTMLElement>('[data-work-section]');
  if (!section) return () => {};

  const cards = Array.from(section.querySelectorAll<HTMLElement>('[data-work-card]'));
  if (!cards.length) return () => {};

  const counterEl = section.querySelector<HTMLElement>('[data-work-counter-current]');
  const pad = (n: number) => String(n).padStart(2, '0');
  const updateCounter = counterEl ? createLiveOdometer(counterEl, '01') : null;
  const cleanups: Array<() => void> = [];

  // 1. Optional hover video playback per card
  cards.forEach((card) => {
    const video = card.querySelector<HTMLVideoElement>('[data-work-video]');
    if (!video) return;

    const onEnter = () => {
      if (isReducedMotion()) return;
      video.style.opacity = '1';
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };

    const onLeave = () => {
      video.style.opacity = '0';
      video.pause();
    };

    card.addEventListener('pointerenter', onEnter);
    card.addEventListener('pointerleave', onLeave);
    cleanups.push(() => {
      card.removeEventListener('pointerenter', onEnter);
      card.removeEventListener('pointerleave', onLeave);
      video.pause();
    });
  });

  // 2. Live Odometer counter sync as cards enter viewport
  cards.forEach((card, i) => {
    const st = ScrollTrigger.create({
      trigger: card,
      start: 'top 55%',
      end: 'bottom 45%',
      onEnter: () => updateCounter?.(pad(i + 1)),
      onEnterBack: () => updateCounter?.(pad(i + 1)),
    });
    cleanups.push(() => st.kill());
  });

  // 3. Heynesh-inspired Stacking Depth Scale (desktop lg+ & motion enabled)
  if (cards.length > 1 && !isReducedMotion()) {
    const mm = window.matchMedia('(min-width: 1024px)');
    let stackTriggers: ScrollTrigger[] = [];
    let stackTweens: gsap.core.Tween[] = [];

    const teardownStack = () => {
      stackTriggers.forEach((st) => st.kill());
      stackTweens.forEach((tw) => tw.kill());
      stackTriggers = [];
      stackTweens = [];
      cards.forEach((c) => {
        const inner = c.querySelector<HTMLElement>('[data-work-card-inner]');
        if (inner) gsap.set(inner, { clearProps: 'transform' });
      });
    };

    const setupStack = () => {
      teardownStack();
      if (!mm.matches) return;

      cards.forEach((card, i) => {
        const nextCard = cards[i + 1];
        const inner = card.querySelector<HTMLElement>('[data-work-card-inner]');
        if (!nextCard || !inner) return;

        const tw = gsap.fromTo(
          inner,
          { scale: 1 },
          {
            scale: 0.94,
            ease: 'none',
            scrollTrigger: {
              trigger: nextCard,
              start: 'top 88%',
              end: 'top 18%',
              scrub: 0.3,
            },
          }
        );
        stackTweens.push(tw);
        if (tw.scrollTrigger) stackTriggers.push(tw.scrollTrigger);
      });
    };

    setupStack();
    mm.addEventListener('change', setupStack);
    cleanups.push(() => {
      mm.removeEventListener('change', setupStack);
      teardownStack();
    });
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
