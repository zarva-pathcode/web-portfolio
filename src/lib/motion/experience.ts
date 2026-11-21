import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { isReducedMotion } from './engine';

export function initExperience(): () => void {
  const list = document.querySelector<HTMLElement>('[data-exp-list]');
  if (!list) return () => {};

  const spineFill = list.querySelector<HTMLElement>('[data-exp-spine-fill]');
  const items = Array.from(list.querySelectorAll<HTMLElement>('[data-exp-item]'));
  const cleanups: Array<() => void> = [];

  // 1. Scroll-scrubbed clay spine line
  if (spineFill) {
    if (isReducedMotion()) {
      gsap.set(spineFill, { scaleY: 1 });
      items.forEach((item) => {
        item.querySelector('[data-exp-dot]')?.classList.add('is-lit');
      });
    } else {
      gsap.set(spineFill, { scaleY: 0, transformOrigin: '50% 0%' });

      const st = ScrollTrigger.create({
        trigger: list,
        start: 'top 72%',
        end: 'bottom 68%',
        scrub: 0.35,
        onUpdate: (self) => {
          gsap.set(spineFill, { scaleY: Math.max(0.05, self.progress) });
        },
      });
      cleanups.push(() => st.kill());

      items.forEach((item, index) => {
        const dot = item.querySelector<HTMLElement>('[data-exp-dot]');
        if (!dot) return;
        if (index === 0) {
          dot.classList.add('is-lit');
          return;
        }
        const dotTrigger = ScrollTrigger.create({
          trigger: item,
          start: 'top 68%',
          onEnter: () => dot.classList.add('is-lit'),
          onLeaveBack: () => dot.classList.remove('is-lit'),
        });
        cleanups.push(() => dotTrigger.kill());
      });
    }
  }

  // 2. Interactive expandable impact highlights per role
  let refreshTimer = 0;
  items.forEach((item) => {
    const btn = item.querySelector<HTMLButtonElement>('[data-exp-toggle]');
    const panel = item.querySelector<HTMLElement>('[data-exp-panel]');
    if (!btn || !panel) return;

    const onClick = () => {
      const willOpen = !item.hasAttribute('data-expanded');
      item.toggleAttribute('data-expanded', willOpen);
      panel.toggleAttribute('data-open', willOpen);
      btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');

      const labelEl = btn.querySelector<HTMLElement>('[data-exp-toggle-label]');
      if (labelEl) {
        const openTxt = labelEl.dataset.openText || labelEl.textContent || '';
        const closeTxt = labelEl.dataset.closeText || openTxt;
        labelEl.textContent = willOpen ? closeTxt : openTxt;
      }

      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        ScrollTrigger.refresh();
      }, 380);
    };

    btn.addEventListener('click', onClick);
    cleanups.push(() => btn.removeEventListener('click', onClick));
  });

  return () => {
    window.clearTimeout(refreshTimer);
    cleanups.forEach((fn) => fn());
  };
}
