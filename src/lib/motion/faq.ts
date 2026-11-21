import ScrollTrigger from 'gsap/ScrollTrigger';

export function initFaq(): () => void {
  const list = document.querySelector<HTMLElement>('[data-faq-list]');
  if (!list) return () => {};

  const items = Array.from(list.querySelectorAll<HTMLElement>('[data-faq-item]'));
  if (!items.length) return () => {};

  const cleanups: Array<() => void> = [];
  let refreshTimer = 0;

  const setItemState = (item: HTMLElement, open: boolean) => {
    const trigger = item.querySelector<HTMLButtonElement>('[data-faq-trigger]');
    const panel = item.querySelector<HTMLElement>('[data-faq-panel]');
    item.toggleAttribute('data-open', open);
    trigger?.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel?.toggleAttribute('data-open', open);
  };

  items.forEach((item) => {
    const trigger = item.querySelector<HTMLButtonElement>('[data-faq-trigger]');
    if (!trigger) return;

    const onClick = () => {
      const willOpen = !item.hasAttribute('data-open');

      // Single-open editorial rhythm (Zamkara style)
      items.forEach((other) => {
        if (other !== item && other.hasAttribute('data-open')) {
          setItemState(other, false);
        }
      });

      setItemState(item, willOpen);

      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        ScrollTrigger.refresh();
      }, 400);
    };

    trigger.addEventListener('click', onClick);
    cleanups.push(() => trigger.removeEventListener('click', onClick));
  });

  return () => {
    window.clearTimeout(refreshTimer);
    cleanups.forEach((fn) => fn());
  };
}
