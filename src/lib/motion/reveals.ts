import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { isReducedMotion } from './engine';

export function prepareSplitWords(el: HTMLElement): void {
  if (el.dataset.splitReady === '1') return;
  el.dataset.splitReady = '1';

  const fullText = (el.textContent || '').replace(/\s+/g, ' ').trim();
  if (!fullText) return;

  const segments: Array<{ word: string; className: string }> = [];

  const collect = (node: Node, inheritedClass: string) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const words = (node.textContent || '').trim().split(/\s+/).filter(Boolean);
      for (const word of words) {
        segments.push({ word, className: inheritedClass });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const elem = node as HTMLElement;
      const cls = [inheritedClass, elem.className].filter(Boolean).join(' ').trim();
      Array.from(elem.childNodes).forEach((child) => collect(child, cls));
    }
  };

  Array.from(el.childNodes).forEach((child) => collect(child, ''));
  if (!segments.length) return;

  el.setAttribute('aria-label', fullText);
  el.textContent = '';

  segments.forEach((seg, i) => {
    const outer = document.createElement('span');
    outer.className = 'word';
    outer.setAttribute('aria-hidden', 'true');

    const inner = document.createElement('span');
    inner.className = seg.className ? `word-inner ${seg.className}` : 'word-inner';
    inner.textContent = seg.word;
    inner.style.setProperty('--i', String(i));

    outer.appendChild(inner);
    el.appendChild(outer);
    if (i < segments.length - 1) {
      el.appendChild(document.createTextNode(' '));
    }
  });
}

export function initReveals(): () => void {
  const reduced = isReducedMotion();
  const cleanups: Array<() => void> = [];

  // 1. Word-split headings (Hero = instant or heroLens-managed; below-fold = reverse onLeaveBack)
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    prepareSplitWords(el);
    if (reduced) {
      el.classList.add('is-in');
      return;
    }

    if (el.closest('#hero')) {
      if (el.hasAttribute('data-hero-managed')) return;
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

  // 2. Hero instant choreography for any non-heroLens-managed elements
  const hero = document.getElementById('hero');
  if (hero) {
    const heroParts = hero.querySelectorAll<HTMLElement>(
      '[data-hero-eyebrow]:not([data-hero-managed]), [data-hero-sub]:not([data-hero-managed]), [data-hero-cta]:not([data-hero-managed]), [data-hero-stats]:not([data-hero-managed])'
    );

    if (heroParts.length) {
      if (reduced) {
        heroParts.forEach((el) => gsap.set(el, { opacity: 1, y: 0 }));
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
      }
    }
  }

  // 3. Below-fold section reveals ([data-reveal]) & staggered groups ([data-stagger])
  //    Play when entering from bottom; reverse cleanly when scrolling back up past threshold.
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal], [data-stagger]');
  targets.forEach((el) => {
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
