import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { isReducedMotion } from './engine';
import { prepareSplitWords } from './reveals';
import { triggerHeroOdometers } from './odometer';

const SEEN_KEY = 'zarvaism:hero-seen';

declare global {
  interface Window {
    __zarvaInAppHeroVisited?: boolean;
  }
}

function hasSeenHeroInTab(): boolean {
  return Boolean(typeof window !== 'undefined' && window.__zarvaInAppHeroVisited);
}

function markSeenHero(): void {
  if (typeof window !== 'undefined') {
    window.__zarvaInAppHeroVisited = true;
    document.documentElement.classList.add('hero-opening-skip');
  }
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    // ignore private browsing storage errors
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function initHeroLens(): () => void {
  const hero = document.getElementById('hero');
  const canvasWrap = hero?.querySelector<HTMLElement>('[data-hero-canvas-wrap]');
  const canvas = canvasWrap?.querySelector<HTMLCanvasElement>('[data-hero-canvas]');
  if (!hero || !canvasWrap || !canvas) return () => {};

  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const sourceImgEl = canvasWrap.querySelector<HTMLImageElement>('[data-hero-source]');
  const srcUrl = canvas.getAttribute('data-hero-src') || sourceImgEl?.currentSrc || sourceImgEl?.src || '';
  const heroCopy = hero.querySelector<HTMLElement>('[data-hero-copy]');
  const headline = hero.querySelector<HTMLElement>('h1[data-split][data-hero-managed]');
  const lensHint = hero.querySelector<HTMLElement>('[data-hero-lens-hint]');
  const opening = hero.querySelector<HTMLElement>('[data-hero-opening]');
  const openingWordmark = opening?.querySelector<HTMLElement>('[data-opening-wordmark]') ?? null;
  const openingChars = opening
    ? Array.from(opening.querySelectorAll<HTMLElement>('[data-opening-char]'))
    : [];
  const openingLine = opening?.querySelector<HTMLElement>('[data-opening-line]') ?? null;
  const openingMeta = opening?.querySelector<HTMLElement>('[data-opening-meta]') ?? null;
  const watermark = hero.querySelector<HTMLElement>('[data-hero-watermark]');
  const watermarkText = hero.querySelector<HTMLElement>('[data-hero-watermark-text]');
  const managedParts = Array.from(
    hero.querySelectorAll<HTMLElement>(
      '[data-hero-eyebrow][data-hero-managed], [data-hero-sub][data-hero-managed], [data-hero-cta][data-hero-managed], [data-hero-stats][data-hero-managed]'
    )
  );

  if (headline) prepareSplitWords(headline);

  const reduced = isReducedMotion();
  const finePointer =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desktopMq = window.matchMedia('(min-width: 1024px)');

  // Pre-allocated offscreen canvases:
  // - sampleCanvas: luminance/chrominance sampling on resize only
  // - portraitCanvas: renders locked-grid halftone so source-atop studio light washes ONLY the dots
  const sampleCanvas = document.createElement('canvas');
  const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  const portraitCanvas = document.createElement('canvas');
  const portraitCtx = portraitCanvas.getContext('2d');
  const photoCanvas = document.createElement('canvas');
  const photoCtx = photoCanvas.getContext('2d');

  const img = new Image();
  img.decoding = 'async';
  let imgReady = false;

  // Layout & pre-sampled architectural halftone grid
  let width = 0;
  let height = 0;
  let dpr = 1;
  let isDesktop = desktopMq.matches;
  let pX = 0;
  let pW = 0;
  let pitch = 6;
  let gridCols = 0;
  let gridRows = 0;
  let toneGrid = new Float32Array(0);
  let alphaGrid = new Float32Array(0);
  let photoRect = { ox: 0, oy: 0, dw: 0, dh: 0 };

  // Interactive motion state
  const state = {
    introProgress: reduced ? 1 : 0,
    scrollProgress: 0,
    touchAlpha: 0,
  };

  let curX = 0;
  let curY = 0;
  let targetX = 0;
  let targetY = 0;
  let pointerInside = false;
  let lightAlpha = 0;
  let targetLightAlpha = 0;
  let parX = 0;
  let parY = 0;
  let targetParX = 0;
  let targetParY = 0;
  let hintDismissed = false;

  let visible = true;
  let killed = false;
  let rafId = 0;
  let resizeRaf = 0;
  let introActive = false;
  let touchTween: gsap.core.Tween | null = null;
  let introTl: gsap.core.Timeline | null = null;

  const isNight = () => document.documentElement.getAttribute('data-theme') === 'night';

  const bakeHalftoneGrid = () => {
    if (!imgReady || !width || !height || !sampleCtx) return;

    const drawW = isDesktop ? pW : width;
    pitch = isDesktop ? 6 : 5.5;
    gridCols = Math.max(1, Math.ceil(drawW / pitch) + 1);
    gridRows = Math.max(1, Math.ceil(height / pitch) + 1);

    sampleCanvas.width = gridCols;
    sampleCanvas.height = gridRows;
    sampleCtx.clearRect(0, 0, gridCols, gridRows);

    const scale = Math.max(drawW / img.naturalWidth, height / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const ox = isDesktop ? (drawW - dw) * 0.54 : (width - dw) * 0.5;
    const oy = isDesktop ? (height - dh) * 0.24 : (height - dh) * 0.16;
    photoRect = { ox, oy, dw, dh };

    sampleCtx.drawImage(img, ox / pitch, oy / pitch, dw / pitch, dh / pitch);

    const pixels = sampleCtx.getImageData(0, 0, gridCols, gridRows).data;
    const total = gridCols * gridRows;
    if (toneGrid.length !== total) {
      toneGrid = new Float32Array(total);
      alphaGrid = new Float32Array(total);
    }

    let borderTotal = 0;
    let borderTransparent = 0;
    for (let col = 0; col < gridCols; col++) {
      borderTotal++;
      if (pixels[col * 4 + 3] < 245) borderTransparent++;
    }
    for (let row = 0; row < gridRows; row++) {
      borderTotal += 2;
      if (pixels[row * gridCols * 4 + 3] < 245) borderTransparent++;
      if (pixels[(row * gridCols + gridCols - 1) * 4 + 3] < 245) borderTransparent++;
    }
    const hasNativeAlpha = borderTransparent / Math.max(1, borderTotal) >= 0.15;

    for (let row = 0; row < gridRows; row++) {
      const ny = row / Math.max(1, gridRows - 1);
      // Clean top & bottom edge fade only (zero circular/oval mask)
      const topFade = isDesktop ? clamp((ny - 0.06) / 0.14, 0, 1) : clamp(ny / 0.12, 0, 1);
      const botFade = isDesktop ? clamp((0.99 - ny) / 0.16, 0, 1) : clamp((1 - ny) / 0.18, 0, 1);
      const vFade = topFade * botFade;

      const rowOff = row * gridCols;
      for (let col = 0; col < gridCols; col++) {
        const idx = rowOff + col;
        const nx = col / Math.max(1, gridCols - 1);

        const hFade = isDesktop
          ? clamp(nx / 0.14, 0, 1) * clamp((1 - nx) / 0.1, 0, 1)
          : 1;

        const o = idx * 4;
        const rCh = pixels[o] / 255;
        const gCh = pixels[o + 1] / 255;
        const bCh = pixels[o + 2] / 255;
        const lum = 0.299 * rCh + 0.587 * gCh + 0.114 * bCh;

        if (hasNativeAlpha) {
          const pixA = pixels[o + 3] / 255;
          const darkness = clamp((0.86 - lum) / 0.82, 0, 1);
          toneGrid[idx] = Math.pow(darkness, 1.2) * pixA;
          alphaGrid[idx] = hFade * vFade * pixA;
        } else {
          // Chrominance fallback for opaque portrait uploads without alpha transparency
          const blueExcess = Math.max(0, bCh - rCh * 1.04);
          const cyanSuppress = clamp(1 - (blueExcess - 0.025) / 0.085, 0, 1);

          const darkness = clamp((0.82 - lum) / 0.78, 0, 1);
          toneGrid[idx] = Math.pow(darkness, 1.24) * cyanSuppress;
          alphaGrid[idx] = hFade * vFade;
        }
      }
    }
  };

  const draw = () => {
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);

    const night = isNight();
    const scrollP = state.scrollProgress;
    const introP = reduced ? 1 : state.introProgress;
    const activeLight = reduced ? 0 : Math.max(lightAlpha, state.touchAlpha);

    // 1. Desktop left reactive architectural dot grid (calm Zamkara rhythm)
    if (isDesktop) {
      const bgPitch = 26;
      const maxX = Math.min(width, pX + pW * 0.16);
      const restPath = new Path2D();
      const hotPath = new Path2D();

      for (let y = 20; y < height - 12; y += bgPitch) {
        for (let x = 22; x < maxX; x += bgPitch) {
          const edgeFade = x > pX ? clamp(1 - (x - pX) / (pW * 0.16), 0, 1) : 1;
          if (edgeFade < 0.08) continue;

          let boost = 0;
          if (!reduced && pointerInside) {
            const dist = Math.hypot(x - curX, y - curY);
            if (dist < 160) {
              boost = Math.pow(1 - dist / 160, 1.4);
            }
          }

          const r = (1.0 + boost * 1.9) * edgeFade * (1 - scrollP * 0.55);
          if (r < 0.45) continue;

          const target = boost > 0.16 ? hotPath : restPath;
          target.moveTo(x + r, y);
          target.arc(x, y, r, 0, Math.PI * 2);
        }
      }

      ctx.fillStyle = night ? 'rgba(228, 231, 236, 0.085)' : 'rgba(22, 24, 29, 0.08)';
      ctx.fill(restPath);
      ctx.fillStyle = night ? 'rgba(242, 95, 76, 0.58)' : 'rgba(201, 51, 38, 0.48)';
      ctx.fill(hotPath);
    }

    if (!imgReady || !gridCols || !gridRows || !portraitCtx) return;

    const drawX = isDesktop ? pX : 0;
    const maxR = pitch * 0.43;

    // 2. Render crisp, grid-locked halftone print onto portraitCanvas (ZERO crawling/squirming)
    portraitCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    portraitCtx.clearRect(0, 0, width, height);

    const softPath = new Path2D();
    const midPath = new Path2D();
    const deepPath = new Path2D();

    // Gentle unified upward glide on scroll (clean architectural elevation, zero chaotic bug-scatter)
    const scrollLiftY = scrollP > 0.005 ? -scrollP * 38 : 0;

    for (let row = 0; row < gridRows; row++) {
      const ny = row / Math.max(1, gridRows - 1);
      const oy = row * pitch + pitch * 0.5;
      const staggerX = row & 1 ? pitch * 0.5 : 0;
      const rowOff = row * gridCols;

      for (let col = 0; col < gridCols; col++) {
        const idx = rowOff + col;
        const a = alphaGrid[idx];
        const tone = toneGrid[idx];
        if (a < 0.04 || tone < 0.05) continue;

        const nx = col / Math.max(1, gridCols - 1);

        // Moment 1: Clean diagonal letterpress ink-bloom sweep (dots bloom crisply in place on their grid)
        let pressScale = 1;
        if (introP < 0.998) {
          const diag = (1 - nx) * 0.62 + ny * 0.38;
          const localP = clamp((introP - diag * 0.46) / 0.54, 0, 1);
          pressScale = 1 - Math.pow(1 - localP, 3);
        }

        // Moment 3: Clean reverse print-fade sweep on scroll (dots recede gracefully top-to-bottom in unison)
        let scrollScale = 1;
        if (scrollP > 0.005) {
          const dissolveWave = clamp(1 - (scrollP * 1.45 - (1 - ny) * 0.55), 0, 1);
          scrollScale = Math.pow(dissolveWave, 1.15);
        }

        const r = Math.min(maxR, tone * maxR * a * pressScale * scrollScale);
        if (r < 0.45) continue;

        // Every dot stays strictly on its clean architectural grid + smooth whole-portrait parallax
        const fx = drawX + col * pitch + staggerX + parX;
        const fy = oy + parY + scrollLiftY;

        let bucket: Path2D;
        if (tone > 0.74) {
          bucket = deepPath;
        } else if (tone > 0.32) {
          bucket = midPath;
        } else {
          bucket = softPath;
        }

        bucket.moveTo(fx + r, fy);
        bucket.arc(fx, fy, r, 0, Math.PI * 2);
      }
    }

    if (night) {
      // 60-30-10 graphite lithograph: neutral bone-silver body + subtle Braun Signal Red outer rim
      portraitCtx.fillStyle = 'rgba(242, 95, 76, 0.36)';
      portraitCtx.fill(softPath);
      portraitCtx.fillStyle = 'rgba(170, 178, 190, 0.78)';
      portraitCtx.fill(midPath);
      portraitCtx.fillStyle = 'rgba(228, 231, 236, 0.92)';
      portraitCtx.fill(deepPath);
    } else {
      // 60-30-10 Swiss print: crisp graphite ink body + subtle Braun Signal Red edge highlight
      portraitCtx.fillStyle = 'rgba(201, 51, 38, 0.26)';
      portraitCtx.fill(softPath);
      portraitCtx.fillStyle = 'rgba(58, 63, 74, 0.76)';
      portraitCtx.fill(midPath);
      portraitCtx.fillStyle = 'rgba(22, 24, 29, 0.92)';
      portraitCtx.fill(deepPath);
    }

    const introReady = clamp((introP - 0.55) / 0.45, 0, 1);
    const scrollFade = clamp(1 - scrollP * 1.35, 0, 1);
    const reveal = activeLight * introReady * scrollFade;

    // Moment 2: Gallery Studio Light Wash (`source-atop` illuminates ONLY the crisp halftone dots)
    if (reveal > 0.015) {
      const lightR = isDesktop ? 245 : 155;
      portraitCtx.save();
      portraitCtx.globalCompositeOperation = 'source-atop';
      const grad = portraitCtx.createRadialGradient(curX, curY, 0, curX, curY, lightR);
      if (night) {
        grad.addColorStop(0, `rgba(255, 138, 120, ${(0.58 * reveal).toFixed(3)})`);
        grad.addColorStop(0.45, `rgba(242, 95, 76, ${(0.30 * reveal).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(242, 95, 76, 0)');
      } else {
        grad.addColorStop(0, `rgba(218, 62, 46, ${(0.56 * reveal).toFixed(3)})`);
        grad.addColorStop(0.48, `rgba(201, 51, 38, ${(0.24 * reveal).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(201, 51, 38, 0)');
      }
      portraitCtx.fillStyle = grad;
      portraitCtx.fillRect(0, 0, width, height);
      portraitCtx.restore();
    }

    const showPhotoLens = reveal > 0.015 && Boolean(photoCtx) && photoRect.dw > 0;
    const baseLensR = isDesktop ? 155 : 108;
    const lensR = baseLensR * (0.72 + 0.28 * reveal);

    if (showPhotoLens && photoCtx) {
      // Melt halftone dots smoothly inside the optical lens
      portraitCtx.save();
      portraitCtx.globalCompositeOperation = 'destination-out';
      const holeGrad = portraitCtx.createRadialGradient(curX, curY, 0, curX, curY, lensR);
      holeGrad.addColorStop(0, `rgba(0, 0, 0, ${reveal.toFixed(3)})`);
      holeGrad.addColorStop(0.72, `rgba(0, 0, 0, ${reveal.toFixed(3)})`);
      holeGrad.addColorStop(0.92, `rgba(0, 0, 0, ${(0.45 * reveal).toFixed(3)})`);
      holeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      portraitCtx.fillStyle = holeGrad;
      portraitCtx.fillRect(0, 0, width, height);
      portraitCtx.restore();

      // Draw pixel-aligned alpha-transparent portrait onto photoCanvas with feathered circular mask
      photoCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      photoCtx.clearRect(0, 0, width, height);
      photoCtx.globalCompositeOperation = 'source-over';
      photoCtx.drawImage(
        img,
        drawX + photoRect.ox + parX,
        photoRect.oy + parY + scrollLiftY,
        photoRect.dw,
        photoRect.dh
      );

      photoCtx.globalCompositeOperation = 'destination-in';
      const lensGrad = photoCtx.createRadialGradient(curX, curY, 0, curX, curY, lensR);
      lensGrad.addColorStop(0, `rgba(0, 0, 0, ${reveal.toFixed(3)})`);
      lensGrad.addColorStop(0.74, `rgba(0, 0, 0, ${reveal.toFixed(3)})`);
      lensGrad.addColorStop(0.92, `rgba(0, 0, 0, ${(0.45 * reveal).toFixed(3)})`);
      lensGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      photoCtx.fillStyle = lensGrad;
      photoCtx.fillRect(0, 0, width, height);

      if (isDesktop) {
        const edgeGrad = photoCtx.createLinearGradient(pX, 0, width, 0);
        edgeGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        edgeGrad.addColorStop(0.08, 'rgba(0, 0, 0, 1)');
        edgeGrad.addColorStop(0.93, 'rgba(0, 0, 0, 1)');
        edgeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        photoCtx.fillStyle = edgeGrad;
        photoCtx.fillRect(0, 0, width, height);
      }

      const vEdgeGrad = photoCtx.createLinearGradient(0, 0, 0, height);
      if (isDesktop) {
        vEdgeGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vEdgeGrad.addColorStop(0.06, 'rgba(0, 0, 0, 0)');
        vEdgeGrad.addColorStop(0.2, 'rgba(0, 0, 0, 1)');
        vEdgeGrad.addColorStop(0.83, 'rgba(0, 0, 0, 1)');
        vEdgeGrad.addColorStop(0.99, 'rgba(0, 0, 0, 0)');
        vEdgeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        vEdgeGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vEdgeGrad.addColorStop(0.12, 'rgba(0, 0, 0, 1)');
        vEdgeGrad.addColorStop(0.82, 'rgba(0, 0, 0, 1)');
        vEdgeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      photoCtx.fillStyle = vEdgeGrad;
      photoCtx.fillRect(0, 0, width, height);

      photoCtx.globalCompositeOperation = 'source-over';
    }

    ctx.drawImage(portraitCanvas, 0, 0, width, height);

    if (showPhotoLens && photoCtx) {
      ctx.drawImage(photoCanvas, 0, 0, width, height);

      ctx.save();
      if (isDesktop) {
        ctx.beginPath();
        ctx.rect(pX + 4, 0, pW - 6, height);
        ctx.clip();
      }
      ctx.beginPath();
      ctx.arc(curX, curY, lensR * 0.9, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = night
        ? `rgba(242, 95, 76, ${(0.36 * reveal).toFixed(3)})`
        : `rgba(201, 51, 38, ${(0.30 * reveal).toFixed(3)})`;
      ctx.stroke();
      ctx.restore();
    }
  };

  const resize = () => {
    const rect = canvasWrap.getBoundingClientRect();
    const nextW = Math.round(rect.width);
    const nextH = Math.round(rect.height);
    if (nextW < 2 || nextH < 2) return;

    const nextDesktop = desktopMq.matches;
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
    if (nextW === width && nextH === height && nextDesktop === isDesktop && nextDpr === dpr) {
      return;
    }

    width = nextW;
    height = nextH;
    isDesktop = nextDesktop;
    dpr = nextDpr;
    pX = isDesktop ? Math.round(width * 0.4) : 0;
    pW = width - pX;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    portraitCanvas.width = canvas.width;
    portraitCanvas.height = canvas.height;
    photoCanvas.width = canvas.width;
    photoCanvas.height = canvas.height;

    if (!pointerInside) {
      curX = isDesktop ? pX + pW * 0.52 : width * 0.5;
      curY = height * 0.45;
      targetX = curX;
      targetY = curY;
    }

    bakeHalftoneGrid();
    draw();
  };

  const needsTick = (): boolean => {
    if (reduced) return false;
    if (introActive) return true;
    if (touchTween && touchTween.isActive()) return true;
    if (Math.abs(targetX - curX) > 0.15 || Math.abs(targetY - curY) > 0.15) return true;
    if (Math.abs(targetLightAlpha - lightAlpha) > 0.008) return true;
    if (Math.abs(targetParX - parX) > 0.05 || Math.abs(targetParY - parY) > 0.05) return true;
    return false;
  };

  const tick = () => {
    if (killed || !visible) {
      rafId = 0;
      return;
    }

    curX += (targetX - curX) * 0.14;
    curY += (targetY - curY) * 0.14;
    lightAlpha += (targetLightAlpha - lightAlpha) * 0.11;
    parX += (targetParX - parX) * 0.10;
    parY += (targetParY - parY) * 0.10;

    draw();

    if (needsTick()) {
      rafId = window.requestAnimationFrame(tick);
    } else {
      rafId = 0;
    }
  };

  const wake = () => {
    if (killed || !visible) return;
    if (reduced) {
      draw();
      return;
    }
    if (!rafId) {
      rafId = window.requestAnimationFrame(tick);
    }
  };

  // Moment 1: Unified Hero intro timeline + HeyNesh-inspired full-stage Wordmark Opening + early-scroll skip
  const hideOpeningImmediate = () => {
    if (opening) {
      gsap.killTweensOf([opening, openingWordmark, ...openingChars, openingLine, openingMeta].filter(Boolean));
      opening.style.display = 'none';
      gsap.set(opening, { clearProps: 'opacity,clipPath,transform' });
    }
    if (watermark) gsap.set(watermark, { clearProps: 'opacity,transform' });
    if (watermarkText) gsap.set(watermarkText, { clearProps: 'opacity,transform' });
  };

  const skipIntroIfRunning = () => {
    if (!introActive) return;
    if (window.scrollY <= 24) return;
    introActive = false;
    state.introProgress = 1;
    if (introTl) {
      introTl.progress(1, true);
      introTl.kill();
      introTl = null;
    }
    hideOpeningImmediate();
    headline?.classList.add('is-in');
    gsap.set(managedParts, { opacity: 1, y: 0, clearProps: 'transform' });
    triggerHeroOdometers({ instant: true });
    markSeenHero();
    window.removeEventListener('scroll', skipIntroIfRunning);
    draw();
  };

  const runIntro = () => {
    if (reduced) {
      state.introProgress = 1;
      hideOpeningImmediate();
      headline?.classList.add('is-in');
      gsap.set(managedParts, { opacity: 1, y: 0 });
      triggerHeroOdometers({ instant: true });
      draw();
      return;
    }

    if (window.scrollY > 24) {
      state.introProgress = 1;
      hideOpeningImmediate();
      headline?.classList.add('is-in');
      gsap.set(managedParts, { opacity: 1, y: 0 });
      triggerHeroOdometers({ instant: true });
      markSeenHero();
      draw();
      return;
    }

    const revisit = hasSeenHeroInTab();
    const expDur = revisit ? 0.55 : 1.55;
    const partDur = revisit ? 0.42 : 0.65;

    introActive = true;
    state.introProgress = 0;
    gsap.set(managedParts, { opacity: 0, y: 16 });
    window.addEventListener('scroll', skipIntroIfRunning, { passive: true });

    introTl = gsap.timeline({
      onUpdate: () => wake(),
      onComplete: () => {
        introActive = false;
        hideOpeningImmediate();
        markSeenHero();
        window.removeEventListener('scroll', skipIntroIfRunning);
        draw();
      },
    });

    // Full-stage HeyNesh-inspired kinetic wordmark opening on initial load & reload
    if (!revisit && opening && openingWordmark) {
      opening.style.display = 'flex';
      gsap.set(opening, {
        opacity: 1,
        clipPath: 'inset(0% 0% 0% 0%)',
      });
      gsap.set(openingWordmark, {
        xPercent: 44,
        scale: 1.06,
      });
      if (openingChars.length > 0) {
        gsap.set(openingChars, {
          yPercent: 45,
          opacity: 0,
        });
      }
      if (openingLine) gsap.set(openingLine, { scaleX: 0 });
      if (openingMeta) gsap.set(openingMeta, { opacity: 0, y: 10 });
      if (watermarkText && isDesktop) {
        gsap.set(watermarkText, { opacity: 0, yPercent: 32 });
      }

      // Beat 1 (0.00s - 0.88s): Giant ZARVAISM sweeps across center stage cleanly
      introTl.to(
        openingWordmark,
        {
          xPercent: 0,
          scale: 1,
          duration: 0.88,
          ease: 'power4.out',
        },
        0
      );
      if (openingChars.length > 0) {
        introTl.to(
          openingChars,
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.62,
            stagger: 0.032,
            ease: 'expo.out',
          },
          0.02
        );
      }
      if (openingLine) {
        introTl.to(
          openingLine,
          {
            scaleX: 1,
            duration: 0.68,
            ease: 'power3.inOut',
          },
          0.16
        );
      }
      if (openingMeta) {
        introTl.to(
          openingMeta,
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
            ease: 'power2.out',
          },
          0.26
        );
      }

      // Beat 2 (0.86s - 1.48s): Wordmark glides down as stage lifts via clip-path into the Hero
      introTl.to(
        openingWordmark,
        {
          yPercent: 32,
          scale: 0.94,
          opacity: 0.14,
          duration: 0.52,
          ease: 'power3.inOut',
        },
        0.84
      );
      if (openingMeta || openingLine) {
        introTl.to(
          [openingMeta, openingLine].filter(Boolean),
          {
            opacity: 0,
            y: -8,
            duration: 0.28,
            ease: 'power2.in',
          },
          0.8
        );
      }
      introTl.to(
        opening,
        {
          clipPath: 'inset(0% 0% 100% 0%)',
          duration: 0.62,
          ease: 'power4.inOut',
        },
        0.88
      );
      if (watermarkText && isDesktop) {
        introTl.to(
          watermarkText,
          {
            opacity: 1,
            yPercent: 18,
            duration: 0.55,
            ease: 'expo.out',
          },
          1.05
        );
      }
    } else {
      hideOpeningImmediate();
    }

    const heroRevealAt = revisit ? 0.02 : 0.96;

    introTl
      .to(
        state,
        {
          introProgress: 1,
          duration: expDur,
          ease: 'sine.inOut',
        },
        revisit ? 0 : 0.12
      )
      .call(
        () => {
          headline?.classList.add('is-in');
        },
        undefined,
        heroRevealAt
      )
      .to(
        managedParts,
        {
          opacity: 1,
          y: 0,
          duration: partDur,
          stagger: revisit ? 0.04 : 0.07,
          ease: 'expo.out',
          clearProps: 'transform',
        },
        revisit ? 0.04 : 1.02
      )
      .call(
        () => {
          triggerHeroOdometers({ fast: revisit });
        },
        undefined,
        revisit ? 0.08 : 1.16
      );

    wake();
  };

  // Moment 2: Desktop smooth gallery spotlight & parallax / Mobile gentle light bloom
  const onDesktopMove = (e: PointerEvent) => {
    if (!isDesktop || reduced || e.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    if (!pointerInside) {
      curX = x;
      curY = y;
      pointerInside = true;
    }

    targetX = x;
    targetY = y;

    const overPortrait =
      x >= pX + pW * 0.06 &&
      x <= width - 8 &&
      y >= height * 0.03 &&
      y <= height * 0.97;
    targetLightAlpha = overPortrait ? 1 : 0;

    if (overPortrait && !hintDismissed) {
      hintDismissed = true;
      lensHint?.setAttribute('data-dismissed', 'true');
    }

    const normX = clamp(x / Math.max(1, width) - 0.5, -0.5, 0.5);
    const normY = clamp(y / Math.max(1, height) - 0.5, -0.5, 0.5);
    targetParX = normX * -14;
    targetParY = normY * -10;

    wake();
  };

  const onDesktopLeave = () => {
    pointerInside = false;
    targetLightAlpha = 0;
    targetParX = 0;
    targetParY = 0;
    wake();
  };

  const onTouchStartOrMove = (e: PointerEvent) => {
    if (isDesktop || reduced || e.pointerType === 'mouse') return;
    const r = canvas.getBoundingClientRect();
    const x = clamp(e.clientX - r.left, 0, width);
    const y = clamp(e.clientY - r.top, 0, height);
    targetX = x;
    targetY = y;
    if (!state.touchAlpha) {
      curX = x;
      curY = y;
    }

    if (state.touchAlpha < 0.99 && (!touchTween || !touchTween.isActive())) {
      touchTween = gsap.to(state, {
        touchAlpha: 1,
        duration: 0.24,
        ease: 'power2.out',
        onUpdate: () => wake(),
      });
    }
    wake();
  };

  const onTouchEnd = () => {
    if (isDesktop || reduced) return;
    touchTween?.kill();
    touchTween = gsap.to(state, {
      touchAlpha: 0,
      duration: 0.6,
      ease: 'power2.out',
      onUpdate: () => wake(),
    });
    wake();
  };

  if (finePointer && !reduced) {
    hero.addEventListener('pointermove', onDesktopMove, { passive: true });
    hero.addEventListener('pointerleave', onDesktopLeave, { passive: true });
  }
  if (!reduced) {
    canvasWrap.addEventListener('pointerdown', onTouchStartOrMove, { passive: true });
    canvasWrap.addEventListener('pointermove', onTouchStartOrMove, { passive: true });
    canvasWrap.addEventListener('pointerup', onTouchEnd, { passive: true });
    canvasWrap.addEventListener('pointercancel', onTouchEnd, { passive: true });
  }

  // Moment 3: Viewport-aware scrubbed scroll dissolve via gsap.matchMedia()
  const mm = gsap.matchMedia();
  if (!reduced) {
    mm.add('(min-width: 1024px)', () => {
      const st = ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          state.scrollProgress = self.progress;
          if (heroCopy) {
            gsap.set(heroCopy, {
              y: -36 * self.progress,
              opacity: clamp(1 - self.progress * 0.72, 0.25, 1),
            });
          }
          draw();
        },
      });
      return () => {
        st.kill();
        if (heroCopy) gsap.set(heroCopy, { clearProps: 'transform,opacity' });
      };
    });

    mm.add('(max-width: 1023px)', () => {
      if (heroCopy) gsap.set(heroCopy, { opacity: 1, y: 0, clearProps: 'transform' });
      const st = ScrollTrigger.create({
        trigger: canvasWrap,
        start: 'clamp(top 10%)',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          state.scrollProgress = self.progress;
          draw();
        },
      });
      return () => {
        st.kill();
      };
    });
  }

  const ro =
    'ResizeObserver' in window
      ? new ResizeObserver(() => {
          if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
          resizeRaf = window.requestAnimationFrame(() => {
            resizeRaf = 0;
            resize();
          });
        })
      : null;
  ro?.observe(canvasWrap);

  const io =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              visible = entry.isIntersecting;
              if (visible) {
                draw();
                if (needsTick()) wake();
              } else if (rafId) {
                window.cancelAnimationFrame(rafId);
                rafId = 0;
              }
            });
          },
          { threshold: 0.01 }
        )
      : null;
  io?.observe(hero);

  const mo = new MutationObserver(() => {
    draw();
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const onImageReady = () => {
    if (killed || imgReady || !img.naturalWidth) return;
    imgReady = true;
    resize();
    bakeHalftoneGrid();
    draw();
  };

  if (srcUrl) {
    img.onload = onImageReady;
    img.src = srcUrl;
    if (img.complete && img.naturalWidth > 0) {
      onImageReady();
    } else if (typeof img.decode === 'function') {
      img.decode().then(onImageReady).catch(() => {
        // onload listener already bound
      });
    }
  }

  resize();
  runIntro();

  return () => {
    killed = true;
    introActive = false;
    img.onload = null;
    if (rafId) window.cancelAnimationFrame(rafId);
    if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
    rafId = 0;
    resizeRaf = 0;
    introTl?.kill();
    touchTween?.kill();
    mm.revert();
    window.removeEventListener('scroll', skipIntroIfRunning);
    hero.removeEventListener('pointermove', onDesktopMove);
    hero.removeEventListener('pointerleave', onDesktopLeave);
    canvasWrap.removeEventListener('pointerdown', onTouchStartOrMove);
    canvasWrap.removeEventListener('pointermove', onTouchStartOrMove);
    canvasWrap.removeEventListener('pointerup', onTouchEnd);
    canvasWrap.removeEventListener('pointercancel', onTouchEnd);
    ro?.disconnect();
    io?.disconnect();
    mo.disconnect();
    if (heroCopy) gsap.set(heroCopy, { clearProps: 'transform,opacity' });
    hideOpeningImmediate();
  };
}
