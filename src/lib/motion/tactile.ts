import gsap from 'gsap';
import { isReducedMotion, prefersFinePointer } from './engine';

function initMagnetic(cleanups: Array<() => void>): void {
  if (isReducedMotion() || !prefersFinePointer()) return;

  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const mode = el.getAttribute('data-magnetic');
    const maxPull = mode === 'soft' ? 4 : 6;

    const xTo = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const relX = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const relY = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      xTo(Math.max(-1, Math.min(1, relX)) * maxPull);
      yTo(Math.max(-1, Math.min(1, relY)) * maxPull);
    };

    const onLeave = () => {
      xTo(0);
      yTo(0);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);

    cleanups.push(() => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      gsap.set(el, { clearProps: 'x,y' });
    });
  });
}

function initPointerBadge(cleanups: Array<() => void>): void {
  const badge = document.getElementById('pointer-badge');
  if (!badge) return;

  if (isReducedMotion() || !prefersFinePointer()) {
    badge.removeAttribute('data-visible');
    return;
  }

  const labelEl = badge.querySelector<HTMLElement>('[data-badge-text]') ?? badge;
  const xTo = gsap.quickTo(badge, 'x', { duration: 0.18, ease: 'power3.out' });
  const yTo = gsap.quickTo(badge, 'y', { duration: 0.18, ease: 'power3.out' });

  let activeTarget: HTMLElement | null = null;

  const show = (el: HTMLElement, e: PointerEvent) => {
    const text = el.getAttribute('data-cursor-label');
    if (!text) return;
    activeTarget = el;
    labelEl.textContent = text;
    if (!badge.hasAttribute('data-visible')) {
      gsap.set(badge, { x: e.clientX + 18, y: e.clientY + 18 });
    }
    badge.setAttribute('data-visible', 'true');
  };

  const hide = () => {
    activeTarget = null;
    badge.removeAttribute('data-visible');
  };

  const onMove = (e: PointerEvent) => {
    if (!activeTarget) return;
    xTo(e.clientX + 18);
    yTo(e.clientY + 18);
  };

  const onOver = (e: PointerEvent) => {
    const hit = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-cursor-label]');
    if (hit) {
      show(hit, e);
    } else if (activeTarget) {
      hide();
    }
  };

  const onOut = (e: PointerEvent) => {
    if (!activeTarget) return;
    const related = e.relatedTarget as HTMLElement | null;
    const nextHit = related?.closest<HTMLElement>('[data-cursor-label]') ?? null;
    if (!nextHit) {
      hide();
    } else if (nextHit !== activeTarget) {
      activeTarget = nextHit;
      labelEl.textContent = nextHit.getAttribute('data-cursor-label') || '';
    }
  };

  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerover', onOver, { passive: true });
  document.addEventListener('pointerout', onOut, { passive: true });
  window.addEventListener('blur', hide);

  cleanups.push(() => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerover', onOver);
    document.removeEventListener('pointerout', onOut);
    window.removeEventListener('blur', hide);
    hide();
  });
}

function initPortraitParallax(cleanups: Array<() => void>): void {
  const stage = document.querySelector<HTMLElement>('[data-portrait]');
  if (!stage || isReducedMotion() || !prefersFinePointer()) return;

  const imgs = Array.from(stage.querySelectorAll<HTMLElement>('img'));
  if (!imgs.length) return;

  const xSetters = imgs.map((img) =>
    gsap.quickTo(img, 'x', { duration: 0.55, ease: 'power3.out' })
  );
  const ySetters = imgs.map((img) =>
    gsap.quickTo(img, 'y', { duration: 0.55, ease: 'power3.out' })
  );

  const onMove = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect();
    const dx = ((e.clientX - r.left) / r.width - 0.5) * 14;
    const dy = ((e.clientY - r.top) / r.height - 0.5) * 10;
    xSetters.forEach((fn) => fn(dx));
    ySetters.forEach((fn) => fn(dy));
  };

  const onLeave = () => {
    xSetters.forEach((fn) => fn(0));
    ySetters.forEach((fn) => fn(0));
  };

  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerleave', onLeave);

  cleanups.push(() => {
    stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerleave', onLeave);
    imgs.forEach((img) => gsap.set(img, { clearProps: 'x,y' }));
  });
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to textarea fallback
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

function initCopyEmail(cleanups: Array<() => void>): void {
  document.querySelectorAll<HTMLElement>('[data-copy-email]').forEach((btn) => {
    let timer = 0;

    const onClick = async (e: MouseEvent) => {
      e.preventDefault();
      const email = btn.getAttribute('data-copy-email');
      if (!email) return;

      const ok = await copyText(email);
      if (!ok) {
        window.location.href = `mailto:${email}`;
        return;
      }

      const status = btn.querySelector<HTMLElement>('[data-copy-status]');
      const defaultLabel = status?.dataset.defaultLabel ?? status?.textContent ?? '';
      const copiedLabel = status?.dataset.copiedLabel ?? 'COPIED ✓';

      btn.setAttribute('data-copied', 'true');
      if (status) {
        if (!status.dataset.defaultLabel) status.dataset.defaultLabel = defaultLabel;
        status.textContent = copiedLabel;
      }

      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        btn.removeAttribute('data-copied');
        if (status && status.dataset.defaultLabel) {
          status.textContent = status.dataset.defaultLabel;
        }
      }, 2000);
    };

    btn.addEventListener('click', onClick);
    cleanups.push(() => {
      window.clearTimeout(timer);
      btn.removeEventListener('click', onClick);
    });
  });
}

export function initTactile(): () => void {
  const cleanups: Array<() => void> = [];
  initMagnetic(cleanups);
  initPointerBadge(cleanups);
  initPortraitParallax(cleanups);
  initCopyEmail(cleanups);

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
