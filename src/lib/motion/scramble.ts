import ScrollTrigger from 'gsap/ScrollTrigger';
import { isReducedMotion } from './engine';

const GLYPHS = '0123456789/—·ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEEP_RE = /[\s—·/·\-→←↗·:.,+]/;

const activeFrames = new WeakMap<HTMLElement, number>();

export function scrambleElement(el: HTMLElement, duration = 260): void {
  if (isReducedMotion()) return;

  const original = el.dataset.scrambleText ?? el.textContent ?? '';
  if (!original.trim()) return;
  if (!el.dataset.scrambleText) {
    el.dataset.scrambleText = original;
  }

  const prev = activeFrames.get(el);
  if (prev) cancelAnimationFrame(prev);

  const chars = [...original];
  const start = performance.now();

  const tick = (now: number) => {
    const progress = Math.min(1, (now - start) / duration);
    const locked = Math.floor(progress * chars.length);

    let out = '';
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (i < locked || KEEP_RE.test(ch)) {
        out += ch;
      } else {
        out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
    }

    el.textContent = out;

    if (progress < 1) {
      activeFrames.set(el, requestAnimationFrame(tick));
    } else {
      el.textContent = original;
      activeFrames.delete(el);
    }
  };

  activeFrames.set(el, requestAnimationFrame(tick));
}

export function initScramble(): () => void {
  if (isReducedMotion()) return () => {};

  const cleanups: Array<() => void> = [];

  document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => {
    const mode = el.getAttribute('data-scramble') || 'hover';
    if (!el.dataset.scrambleText && el.textContent) {
      el.dataset.scrambleText = el.textContent;
    }

    if (mode === 'hover') {
      const onTrigger = () => scrambleElement(el, 240);
      el.addEventListener('pointerenter', onTrigger);
      el.addEventListener('focus', onTrigger);
      cleanups.push(() => {
        el.removeEventListener('pointerenter', onTrigger);
        el.removeEventListener('focus', onTrigger);
      });
    } else if (mode === 'view') {
      if (el.closest('#hero')) {
        scrambleElement(el, 360);
      } else {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          once: true,
          onEnter: () => scrambleElement(el, 320),
        });
      }
    }
  });

  return () => {
    cleanups.forEach((fn) => fn());
    document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => {
      const frame = activeFrames.get(el);
      if (frame) {
        cancelAnimationFrame(frame);
        activeFrames.delete(el);
      }
      if (el.dataset.scrambleText) {
        el.textContent = el.dataset.scrambleText;
      }
    });
  };
}
