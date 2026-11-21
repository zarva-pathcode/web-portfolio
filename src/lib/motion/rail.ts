import gsap from 'gsap';
import { getLenis, isReducedMotion } from './engine';

export function initRail(): () => void {
  const cleanups: Array<() => void> = [];

  // -------------------------------------------------------------------------
  // 1. Vertical Scroll Progress + Accurate Live Section Spy (01–07)
  // -------------------------------------------------------------------------
  const progressEl = document.querySelector<HTMLElement>('[data-rail-progress]');
  const railLinks = Array.from(document.querySelectorAll<HTMLElement>('[data-rail-link]'));
  const targets = railLinks
    .map((a) => {
      const id = a.getAttribute('data-rail-link') || '';
      const el = id ? document.getElementById(id) : null;
      return el ? { id, el } : null;
    })
    .filter((t): t is { id: string; el: HTMLElement } => Boolean(t));

  let activeId = '';
  const activate = (id: string) => {
    if (!id || id === activeId) return;
    activeId = id;
    railLinks.forEach((a) => {
      const on = a.getAttribute('data-rail-link') === id;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  };

  let ticking = false;
  const syncScrollState = () => {
    ticking = false;

    const maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    );
    const ratio = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    if (progressEl) {
      progressEl.style.transform = `scaleY(${Math.max(0.04, ratio).toFixed(4)})`;
    }

    if (targets.length) {
      const probeY = window.innerHeight * 0.32;
      let best = targets[0].id;
      for (const t of targets) {
        if (t.el.getBoundingClientRect().top <= probeY) {
          best = t.id;
        }
      }
      // At very bottom of page, highlight the last tracked section
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 40) {
        best = targets[targets.length - 1].id;
      }
      activate(best);
    }
  };

  const scheduleSync = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(syncScrollState);
  };

  if (progressEl || targets.length) {
    window.addEventListener('scroll', scheduleSync, { passive: true });
    window.addEventListener('resize', scheduleSync);
    syncScrollState();
    cleanups.push(() => {
      window.removeEventListener('scroll', scheduleSync);
      window.removeEventListener('resize', scheduleSync);
    });
  }

  // -------------------------------------------------------------------------
  // 2. Animated Editorial Spine Drawer (Hamburger <-> X + Clip-Path Wipe)
  // -------------------------------------------------------------------------
  const root = document.documentElement;
  const shell = document.querySelector<HTMLElement>('[data-nav-shell]');
  const scrim = document.querySelector<HTMLElement>('[data-nav-scrim]');
  const drawer = document.querySelector<HTMLElement>('[data-nav-panel]');
  const openers = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-nav-open]'));
  const closers = Array.from(document.querySelectorAll<HTMLElement>('[data-nav-close]'));
  const linkInners = drawer
    ? Array.from(drawer.querySelectorAll<HTMLElement>('[data-drawer-link-inner]'))
    : [];
  const drawerFooter = drawer?.querySelector<HTMLElement>('[data-drawer-footer]') ?? null;

  if (shell && scrim && drawer && openers.length) {
    let isOpen = false;
    let activeTl: gsap.core.Timeline | null = null;
    let lastTrigger: HTMLElement | null = null;

    const isDesktop = () => window.matchMedia('(min-width: 640px)').matches;
    const closedClip = () =>
      isDesktop() ? 'inset(0% 100% 0% 0%)' : 'inset(100% 0% 0% 0%)';

    const setTriggersExpanded = (open: boolean) => {
      root.toggleAttribute('data-menu-open', open);
      openers.forEach((btn) => {
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
    };

    const lockScroll = (locked: boolean) => {
      root.style.overflow = locked ? 'hidden' : '';
      const lenis = getLenis();
      if (lenis) {
        if (locked) lenis.stop();
        else lenis.start();
      }
    };

    const openMenu = (trigger?: HTMLElement | null) => {
      if (isOpen) return;
      isOpen = true;
      lastTrigger = trigger ?? null;
      activeTl?.kill();

      shell.hidden = false;
      setTriggersExpanded(true);
      lockScroll(true);

      if (isReducedMotion()) {
        gsap.set(scrim, { opacity: 1 });
        gsap.set(drawer, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 });
        gsap.set(linkInners, { yPercent: 0, opacity: 1 });
        if (drawerFooter) gsap.set(drawerFooter, { opacity: 1, y: 0 });
        drawer.querySelector<HTMLElement>('a, button')?.focus();
        return;
      }

      gsap.set(scrim, { opacity: 0 });
      gsap.set(drawer, { clipPath: closedClip(), opacity: 1 });
      gsap.set(linkInners, { yPercent: 108, opacity: 0 });
      if (drawerFooter) gsap.set(drawerFooter, { opacity: 0, y: 12 });

      activeTl = gsap.timeline({
        onComplete: () => {
          drawer.querySelector<HTMLElement>('[data-nav-link]')?.focus();
        },
      });

      activeTl
        .to(scrim, { opacity: 1, duration: 0.36, ease: 'power2.out' }, 0)
        .to(
          drawer,
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 0.54,
            ease: 'expo.out',
          },
          0.02
        )
        .to(
          linkInners,
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.54,
            stagger: 0.04,
            ease: 'expo.out',
          },
          0.14
        );

      if (drawerFooter) {
        activeTl.to(
          drawerFooter,
          { opacity: 1, y: 0, duration: 0.38, ease: 'power3.out' },
          0.3
        );
      }
    };

    const closeMenu = (restoreFocus = true) => {
      if (!isOpen) return;
      isOpen = false;
      activeTl?.kill();

      setTriggersExpanded(false);
      lockScroll(false);

      const finish = () => {
        shell.hidden = true;
        if (restoreFocus && lastTrigger) {
          lastTrigger.focus();
        }
      };

      if (isReducedMotion()) {
        finish();
        return;
      }

      activeTl = gsap.timeline({ onComplete: finish });
      activeTl
        .to(
          linkInners,
          {
            yPercent: -35,
            opacity: 0,
            duration: 0.2,
            stagger: 0.015,
            ease: 'power2.in',
          },
          0
        )
        .to(
          drawer,
          {
            clipPath: closedClip(),
            duration: 0.38,
            ease: 'power3.inOut',
          },
          0.04
        )
        .to(scrim, { opacity: 0, duration: 0.28, ease: 'power2.out' }, 0.08);
    };

    const onToggle = (e: Event) => {
      const btn = e.currentTarget as HTMLElement;
      if (isOpen) closeMenu(true);
      else openMenu(btn);
    };

    const onCloseClick = () => closeMenu(true);
    const onScrimClick = () => closeMenu(true);
    const onLinkClick = () => closeMenu(false);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) closeMenu(true);
    };

    openers.forEach((btn) => btn.addEventListener('click', onToggle));
    closers.forEach((btn) => btn.addEventListener('click', onCloseClick));
    scrim.addEventListener('click', onScrimClick);
    drawer
      .querySelectorAll<HTMLElement>('[data-nav-link]')
      .forEach((a) => a.addEventListener('click', onLinkClick));
    document.addEventListener('keydown', onKeyDown);

    cleanups.push(() => {
      activeTl?.kill();
      openers.forEach((btn) => btn.removeEventListener('click', onToggle));
      closers.forEach((btn) => btn.removeEventListener('click', onCloseClick));
      scrim.removeEventListener('click', onScrimClick);
      drawer
        .querySelectorAll<HTMLElement>('[data-nav-link]')
        .forEach((a) => a.removeEventListener('click', onLinkClick));
      document.removeEventListener('keydown', onKeyDown);
      root.removeAttribute('data-menu-open');
      root.style.overflow = '';
      shell.hidden = true;
    });
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
