import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { getLenis, isReducedMotion } from './engine';

export function initExperience(): () => void {
  const section = document.getElementById('experience');
  const list = document.querySelector<HTMLElement>('[data-exp-list]');
  if (!section || !list) return () => {};

  const items = Array.from(list.querySelectorAll<HTMLElement>('[data-exp-item]'));
  if (!items.length) return () => {};

  const reduced = isReducedMotion();
  const cleanups: Array<() => void> = [];

  let isSectionVisible = false;
  let idleTimer = 0;

  // Helper to set a single item's expanded state
  const setItemExpanded = (item: HTMLElement, expanded: boolean, animatePoints: boolean) => {
    const btn = item.querySelector<HTMLButtonElement>('[data-exp-toggle]');
    const panel = item.querySelector<HTMLElement>('[data-exp-panel]');
    const points = Array.from(item.querySelectorAll<HTMLElement>('[data-exp-point]'));
    if (!btn || !panel) return;

    item.toggleAttribute('data-expanded', expanded);
    panel.toggleAttribute('data-open', expanded);
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');

    const labelEl = btn.querySelector<HTMLElement>('[data-exp-toggle-label]');
    if (labelEl) {
      const openTxt = labelEl.dataset.openText || labelEl.textContent || '';
      const closeTxt = labelEl.dataset.closeText || openTxt;
      labelEl.textContent = expanded ? closeTxt : openTxt;
    }

    if (expanded && animatePoints && !reduced && points.length) {
      gsap.fromTo(
        points,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.34,
          stagger: 0.035,
          delay: 0.06,
          ease: 'power3.out',
          clearProps: 'transform',
        }
      );
    }
  };

  // Silently collapse expanded impacts ONLY after scroll is completely idle & section is offscreen,
  // compensating scrollY in the same frame so the visible section below moves by 0px.
  const collapseAllWhenIdle = () => {
    const openItems = items.filter((it) => it.hasAttribute('data-expanded'));
    if (!openItems.length) return;

    const lenis = getLenis();
    if (lenis && (lenis.isScrolling || Math.abs(lenis.velocity) > 0.05)) {
      scheduleIdleReset();
      return;
    }

    const rect = section.getBoundingClientRect();
    const completelyOffscreen = rect.bottom <= 2 || rect.top >= window.innerHeight - 2;
    if (!completelyOffscreen) return;

    const isAboveViewport = rect.bottom <= 2;
    const bottomBefore = rect.bottom;

    list.classList.add('exp-instant-reset');
    openItems.forEach((it) => setItemExpanded(it, false, false));

    // Measure actual post-collapse visual shift (accounts for browser native scroll-anchoring
    // so we never double-compensate in Chromium while still compensating in Safari/Firefox).
    const bottomAfter = section.getBoundingClientRect().bottom;
    const residualShift = bottomBefore - bottomAfter;

    if (isAboveViewport && Math.abs(residualShift) > 1) {
      const nextY = Math.max(0, window.scrollY - residualShift);
      if (lenis) {
        lenis.resize();
        lenis.scrollTo(nextY, { immediate: true, force: true });
      } else {
        window.scrollTo({ top: nextY, behavior: 'auto' });
      }
    } else if (lenis) {
      lenis.resize();
    }

    requestAnimationFrame(() => {
      list.classList.remove('exp-instant-reset');
      ScrollTrigger.refresh();
    });
  };

  const scheduleIdleReset = () => {
    window.clearTimeout(idleTimer);
    if (isSectionVisible) return;
    const hasOpen = items.some((it) => it.hasAttribute('data-expanded'));
    if (!hasOpen) return;
    idleTimer = window.setTimeout(collapseAllWhenIdle, 280);
  };

  // 1. Track viewport visibility (pauses ambient pulse offscreen + arms idle auto-reset)
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          isSectionVisible = e.isIntersecting;
          if (!reduced) {
            list.setAttribute('data-in-view', e.isIntersecting ? 'true' : 'false');
          }
          if (e.isIntersecting) {
            window.clearTimeout(idleTimer);
          } else {
            scheduleIdleReset();
          }
        });
      },
      { threshold: 0 }
    );
    io.observe(section);
    cleanups.push(() => io.disconnect());
  }

  const onScroll = () => {
    if (!isSectionVisible) {
      scheduleIdleReset();
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  cleanups.push(() => window.removeEventListener('scroll', onScroll));

  // 2. Smooth vertical scroll-axis card entrance (no CSS transition-all fighting GSAP)
  if (!reduced) {
    items.forEach((item) => {
      const card = item.querySelector<HTMLElement>('[data-exp-card]');
      if (!card) return;
      const tw = gsap.fromTo(
        card,
        { y: 24, scale: 0.985, opacity: 0 },
        {
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 0.56,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: item,
            start: 'top 90%',
            toggleActions: 'play none none reverse',
          },
        }
      );
      cleanups.push(() => {
        tw.scrollTrigger?.kill();
        tw.kill();
      });
    });
  }

  // 3. Click-anywhere card expansion
  let refreshTimer = 0;

  items.forEach((item) => {
    const card = item.querySelector<HTMLElement>('[data-exp-card]');
    if (!card) return;

    const onCardClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('a')) return;

      const willOpen = !item.hasAttribute('data-expanded');
      setItemExpanded(item, willOpen, true);

      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        ScrollTrigger.refresh();
      }, 390);
    };

    card.addEventListener('click', onCardClick);
    cleanups.push(() => card.removeEventListener('click', onCardClick));
  });

  return () => {
    window.clearTimeout(idleTimer);
    window.clearTimeout(refreshTimer);
    cleanups.forEach((fn) => fn());
  };
}
