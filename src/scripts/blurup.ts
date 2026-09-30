/**
 * Blur-up: flips each wrapper to its loaded state once the real image decodes.
 *
 * Idempotent and re-runnable, because Astro's ClientRouter swaps the DOM on
 * navigation and these listeners are bound to elements that get replaced.
 */
export function initBlurUp() {
  for (const img of document.querySelectorAll<HTMLImageElement>('img[data-blur-img]')) {
    const wrap = img.closest<HTMLElement>('[data-blur-wrap]');
    if (!wrap || wrap.dataset.loaded) continue;

    if (img.complete && img.naturalWidth > 0) {
      wrap.dataset.loaded = '';
    } else {
      img.addEventListener('load', () => { wrap.dataset.loaded = ''; }, { once: true });
      // A failed load must not leave the image permanently invisible.
      img.addEventListener('error', () => { wrap.dataset.loaded = ''; }, { once: true });
    }
  }
}
