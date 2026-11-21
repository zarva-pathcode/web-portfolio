import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { isReducedMotion } from './engine';

function prepareSplitWords(el: HTMLElement): void {
  if (el.dataset.splitReady === '1') return;
  el.dataset.splitReady = '1';

  const text = (el.textContent || '').trim();
  if (!text) return;

  el.setAttribute('aria-label', text);
  const words = text.split(/\s+/);
  el.textContent = '';

  words.forEach((word, i) => {
    const outer = document.createElement('span');
    outer.className = 'word';
    outer.setAttribute('aria-hidden', 'true');

    const inner = document.createElement('span');
    inner.className = 'word-inner';
    inner.textContent = word;
    inner.style.setProperty('--i', String(i));

    outer.appendChild(inner);
    el.appendChild(outer);
    if (i < words.length - 1) {
      el.appendChild(document.createTextNode(' '));
    }
  });
}

export function initReveals(): () => void {
  const reduced = isReducedMotion();
  const cleanups: Array<() => void> = [];

  // 1. Word-split headings (Hero = instant once; below-fold = Heynesh reverse onLeaveBack)
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    prepareSplitWords(el);
    if (reduced) {
      el.classList.add('is-in');
      return;
    }

    if (el.closest('#hero')) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('is-in'));
      });
    } else {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        onEnter: () => el.classList.add('is-in'),
        onLeaveBack: () => el.classList.remove('is-in'),
      });
    }
  });

  // 2. Hero instant choreography (< 1.1s, no blocking curtain, never reverses at top)
  const hero = document.getElementById('hero');
  if (hero) {
    const heroParts = hero.querySelectorAll<HTMLElement>(
      '[data-hero-eyebrow], [data-hero-sub], [data-hero-cta], [data-hero-stats]'
    );
    const heroMedia = hero.querySelector<HTMLElement>('[data-reveal="screen"]');

    if (reduced) {
      heroParts.forEach((el) => gsap.set(el, { opacity: 1, y: 0 }));
      heroMedia?.classList.add('is-in');
    } else {
      gsap.fromTo(
        heroParts,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.65,
          stagger: 0.08,
          delay: 0.08,
          ease: 'expo.out',
          clearProps: 'transform',
        }
      );

      if (heroMedia) {
        gsap.delayedCall(0.14, () => heroMedia.classList.add('is-in'));
      }
    }
  }

  // 3. Below-fold section reveals ([data-reveal]) & staggered groups ([data-stagger])
  //    Play when entering from bottom; reverse cleanly when scrolling back up past threshold.
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal], [data-stagger]');
  targets.forEach((el) => {
    if (el.closest('#hero') && el.getAttribute('data-reveal') === 'screen') return;

    if (el.hasAttribute('data-stagger')) {
      Array.from(el.children).forEach((child, i) => {
        (child as HTMLElement).style.setProperty(
          '--reveal-delay',
          `${Math.min(i * 65, 390)}ms`
        );
      });
    }

    if (reduced) {
      el.classList.add('is-in');
      return;
    }

    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      onEnter: () => el.classList.add('is-in'),
      onLeaveBack: () => el.classList.remove('is-in'),
    });

    // Ensure elements already above the trigger line on initial load (e.g. deep anchor URL) reveal immediately
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
    }
  });

  // 4. How I Work horizontal step connector sweep (reverses cleanly when scrolling above #how)
  const connector = document.querySelector<HTMLElement>('[data-step-connector]');
  if (connector) {
    if (reduced) {
      gsap.set(connector, { scaleX: 1 });
    } else {
      gsap.fromTo(
        connector,
        { scaleX: 0, transformOrigin: '0% 50%' },
        {
          scaleX: 1,
          duration: 0.95,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: connector,
            start: 'top 88%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }
  }

  // 5. Live Bento SVG loops: only animate while visible in viewport (battery-friendly)
  const bentoDiagrams = Array.from(document.querySelectorAll<HTMLElement>('[data-bento-diagram]'));
  if (bentoDiagrams.length && !reduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.setAttribute('data-in-view', entry.isIntersecting ? 'true' : 'false');
        });
      },
      { threshold: 0.15 }
    );
    bentoDiagrams.forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
