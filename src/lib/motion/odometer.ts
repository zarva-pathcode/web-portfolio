import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { isReducedMotion } from './engine';

interface ReelSlot {
  strip: HTMLElement;
  current: number;
}

function buildOdometerDom(el: HTMLElement, text: string): ReelSlot[] {
  el.setAttribute('aria-label', text);
  el.textContent = '';

  const wrap = document.createElement('span');
  wrap.className = 'odometer';
  wrap.setAttribute('aria-hidden', 'true');

  const slots: ReelSlot[] = [];

  for (const ch of text) {
    if (/^\d$/.test(ch)) {
      const col = document.createElement('span');
      col.className = 'odometer-col';

      const strip = document.createElement('span');
      strip.className = 'odometer-strip';

      for (let d = 0; d <= 9; d++) {
        const digit = document.createElement('span');
        digit.className = 'odometer-digit';
        digit.textContent = String(d);
        strip.appendChild(digit);
      }

      col.appendChild(strip);
      wrap.appendChild(col);
      slots.push({ strip, current: Number(ch) });
    } else {
      const stat = document.createElement('span');
      stat.className = 'odometer-static';
      stat.textContent = ch;
      wrap.appendChild(stat);
    }
  }

  el.appendChild(wrap);
  return slots;
}

export function initOdometers(): void {
  const els = document.querySelectorAll<HTMLElement>('[data-odometer]');
  if (!els.length) return;

  const reduced = isReducedMotion();

  els.forEach((el) => {
    const raw = (el.getAttribute('data-odometer') || el.textContent || '').trim();
    if (!raw) return;

    const slots = buildOdometerDom(el, raw);
    if (!slots.length) return;

    if (reduced) {
      slots.forEach((s) => gsap.set(s.strip, { yPercent: -s.current * 10 }));
      return;
    }

    const inHero = Boolean(el.closest('#hero'));

    slots.forEach((s) => gsap.set(s.strip, { yPercent: 0 }));

    const run = () => {
      slots.forEach((s, i) => {
        gsap.to(s.strip, {
          yPercent: -s.current * 10,
          duration: 1.05,
          delay: (inHero ? 0.28 : 0) + i * 0.06,
          ease: 'power3.out',
          overwrite: 'auto',
        });
      });
    };

    if (inHero) {
      run();
    } else {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: run,
      });
    }
  });
}

export function createLiveOdometer(
  el: HTMLElement,
  initialText: string
): (nextText: string) => void {
  const slots = buildOdometerDom(el, initialText);
  slots.forEach((s) => gsap.set(s.strip, { yPercent: -s.current * 10 }));

  let lastText = initialText;

  return (nextText: string) => {
    if (nextText === lastText) return;
    lastText = nextText;
    el.setAttribute('aria-label', nextText);

    const digits = [...nextText].filter((ch) => /^\d$/.test(ch)).map(Number);
    if (digits.length !== slots.length) {
      const rebuilt = buildOdometerDom(el, nextText);
      rebuilt.forEach((s) => gsap.set(s.strip, { yPercent: -s.current * 10 }));
      return;
    }

    const reduced = isReducedMotion();
    slots.forEach((slot, idx) => {
      const next = digits[idx] ?? 0;
      if (next === slot.current) return;
      slot.current = next;

      if (reduced) {
        gsap.set(slot.strip, { yPercent: -next * 10 });
      } else {
        gsap.to(slot.strip, {
          yPercent: -next * 10,
          duration: 0.52,
          delay: idx * 0.04,
          ease: 'power3.out',
          overwrite: 'auto',
        });
      }
    });
  };
}
