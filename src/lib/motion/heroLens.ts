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

function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / Math.max(0.0001, e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
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
  const maskCanvas = document.createElement('canvas');
  const maskCtx = maskCanvas.getContext('2d');
  const baseBgCanvas = document.createElement('canvas');
  const baseBgCtx = baseBgCanvas.getContext('2d');
  const basePortraitCanvas = document.createElement('canvas');
  const basePortraitCtx = basePortraitCanvas.getContext('2d');

  const img = new Image();
  img.decoding = 'async';
  let imgReady = false;
  let staticLayersTheme = '';
  let staticLayersDirty = true;

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
  let pixAlphaGrid = new Float32Array(0);
  let photoRect = { ox: 0, oy: 0, dw: 0, dh: 0 };

  // Interactive motion state & liquid brush trail
  const state = {
    introProgress: reduced ? 1 : 0,
    scrollProgress: 0,
    touchAlpha: 0,
  };
  const trail: Array<{ x: number; y: number; life: number; r: number }> = [];

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
  let scrollRaf = 0;
  let lastTickTime = 0;
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
      pixAlphaGrid = new Float32Array(total);
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
      // Clean top edge fade only on desktop so suit shoulders anchor flush onto the ticker border
      const topFade = isDesktop ? clamp((ny - 0.06) / 0.14, 0, 1) : clamp(ny / 0.12, 0, 1);
      const botFade = isDesktop ? 1 : clamp((1 - ny) / 0.18, 0, 1);
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
          pixAlphaGrid[idx] = pixA;
        } else {
          // Chrominance fallback for opaque portrait uploads without alpha transparency
          const blueExcess = Math.max(0, bCh - rCh * 1.04);
          const cyanSuppress = clamp(1 - (blueExcess - 0.025) / 0.085, 0, 1);

          const darkness = clamp((0.82 - lum) / 0.78, 0, 1);
          toneGrid[idx] = Math.pow(darkness, 1.24) * cyanSuppress;
          alphaGrid[idx] = hFade * vFade;
          pixAlphaGrid[idx] = toneGrid[idx] > 0.06 ? 1 : 0;
        }
      }
    }
    staticLayersDirty = true;
  };

  const bakeStaticLayers = (night: boolean) => {
    if (!width || !height) return;

    // 1. Pre-bake desktop edge-to-edge rest dot matrix once per resize / theme swap
    if (isDesktop && baseBgCtx) {
      baseBgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      baseBgCtx.clearRect(0, 0, width, height);

      const bgPitch = 24;
      const drawX = pX;
      const restPath = new Path2D();
      for (let y = 8; y <= height - 4; y += bgPitch) {
        for (let x = 10; x <= width - 10; x += bgPitch) {
          const edgeL = clamp((x - 4) / 14, 0, 1);
          const edgeR = clamp((width - 4 - x) / 14, 0, 1);
          const edgeFade = Math.min(edgeL, edgeR);
          if (edgeFade < 0.08) continue;

          let bodyMask = 0;
          if (imgReady && gridCols && gridRows) {
            const gc = Math.round((x - drawX) / pitch);
            const gr = Math.round(y / pitch);
            if (gc >= 0 && gc < gridCols && gr >= 0 && gr < gridRows) {
              bodyMask = pixAlphaGrid[gr * gridCols + gc];
            }
          }
          const r = 1.1 * edgeFade * (1 - bodyMask * 0.8);
          if (r < 0.42) continue;

          restPath.moveTo(x + r, y);
          restPath.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      baseBgCtx.fillStyle = night ? 'rgba(228, 231, 236, 0.11)' : 'rgba(22, 24, 29, 0.095)';
      baseBgCtx.fill(restPath);
    } else if (baseBgCtx) {
      baseBgCtx.setTransform(1, 0, 0, 1, 0, 0);
      baseBgCtx.clearRect(0, 0, baseBgCanvas.width, baseBgCanvas.height);
    }

    // 2. Pre-bake settled halftone portrait once per image load / resize / theme swap
    if (basePortraitCtx) {
      basePortraitCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      basePortraitCtx.clearRect(0, 0, width, height);

      if (imgReady && gridCols && gridRows) {
        const drawX = isDesktop ? pX : 0;
        const maxR = pitch * 0.43;
        const softPath = new Path2D();
        const midPath = new Path2D();
        const deepPath = new Path2D();

        for (let row = 0; row < gridRows; row++) {
          const oy = row * pitch + pitch * 0.5;
          const staggerX = row & 1 ? pitch * 0.5 : 0;
          const rowOff = row * gridCols;
          for (let col = 0; col < gridCols; col++) {
            const idx = rowOff + col;
            const a = alphaGrid[idx];
            const tone = toneGrid[idx];
            if (a < 0.04 || tone < 0.05) continue;

            const r = Math.min(maxR, tone * maxR * a);
            if (r < 0.42) continue;

            const fx = drawX + col * pitch + staggerX;
            const bucket = tone > 0.74 ? deepPath : tone > 0.32 ? midPath : softPath;
            bucket.moveTo(fx + r, oy);
            bucket.arc(fx, oy, r, 0, Math.PI * 2);
          }
        }

        if (night) {
          basePortraitCtx.fillStyle = 'rgba(242, 95, 76, 0.36)';
          basePortraitCtx.fill(softPath);
          basePortraitCtx.fillStyle = 'rgba(170, 178, 190, 0.78)';
          basePortraitCtx.fill(midPath);
          basePortraitCtx.fillStyle = 'rgba(228, 231, 236, 0.92)';
          basePortraitCtx.fill(deepPath);
        } else {
          basePortraitCtx.fillStyle = 'rgba(201, 51, 38, 0.26)';
          basePortraitCtx.fill(softPath);
          basePortraitCtx.fillStyle = 'rgba(58, 63, 74, 0.76)';
          basePortraitCtx.fill(midPath);
          basePortraitCtx.fillStyle = 'rgba(22, 24, 29, 0.92)';
          basePortraitCtx.fill(deepPath);
        }
      }
    }

    staticLayersTheme = night ? 'night' : 'paper';
    staticLayersDirty = false;
  };

  const isNearPortrait = (px: number, py: number): boolean => {
    if (!imgReady || !gridCols || !gridRows) return false;
    const drawX = isDesktop ? pX : 0;
    const scrollLiftY = state.scrollProgress > 0.005 ? -state.scrollProgress * 38 : 0;
    const lx = px - parX - drawX;
    const ly = py - parY - scrollLiftY;
    const cCenter = Math.round(lx / pitch);
    const rCenter = Math.round(ly / pitch);
    const radiusCells = Math.ceil(44 / pitch);
    for (let dr = -radiusCells; dr <= radiusCells; dr++) {
      const rr = rCenter + dr;
      if (rr < 0 || rr >= gridRows) continue;
      const rowOff = rr * gridCols;
      for (let dc = -radiusCells; dc <= radiusCells; dc++) {
        if (dr * dr + dc * dc > radiusCells * radiusCells) continue;
        const cc = cCenter + dc;
        if (cc < 0 || cc >= gridCols) continue;
        const idx = rowOff + cc;
        if (pixAlphaGrid[idx] > 0.25 && alphaGrid[idx] > 0.08) {
          return true;
        }
      }
    }
    return false;
  };

  const draw = () => {
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);

    const night = isNight();
    const themeKey = night ? 'night' : 'paper';
    if (staticLayersDirty || staticLayersTheme !== themeKey) {
      bakeStaticLayers(night);
    }

    const scrollP = state.scrollProgress;
    const introP = reduced ? 1 : state.introProgress;
    const drawX = isDesktop ? pX : 0;
    const scrollLiftY = scrollP > 0.005 ? -scrollP * 38 : 0;
    const px = Math.round(parX * dpr) / dpr;
    const py = Math.round(parY * dpr) / dpr;

    // 1. Desktop full-bleed reactive dot grid: O(1) static blit + tiny local hot patch near cursor
    if (isDesktop && baseBgCtx) {
      const bgScrollAlpha = scrollP > 0.005 ? clamp(1 - scrollP * 0.55, 0, 1) : 1;
      if (bgScrollAlpha > 0.02) {
        if (bgScrollAlpha < 0.995) {
          ctx.save();
          ctx.globalAlpha = bgScrollAlpha;
          ctx.drawImage(baseBgCanvas, 0, 0, width, height);
          ctx.restore();
        } else {
          ctx.drawImage(baseBgCanvas, 0, 0, width, height);
        }

        if (!reduced && pointerInside) {
          const bgPitch = 24;
          const hotRadius = 185;
          const hotPath = new Path2D();
          const startX = Math.max(10, 10 + Math.floor((curX - hotRadius - 10) / bgPitch) * bgPitch);
          const endX = Math.min(width - 10, curX + hotRadius);
          const startY = Math.max(8, 8 + Math.floor((curY - hotRadius - 8) / bgPitch) * bgPitch);
          const endY = Math.min(height - 4, curY + hotRadius);

          for (let y = startY; y <= endY; y += bgPitch) {
            for (let x = startX; x <= endX; x += bgPitch) {
              const vx = x - curX;
              const vy = y - curY;
              const dist = Math.hypot(vx, vy);
              if (dist >= hotRadius) continue;

              const boost = Math.pow(1 - dist / hotRadius, 1.45);
              if (boost <= 0.14) continue;

              const edgeFade = Math.min(clamp((x - 4) / 14, 0, 1), clamp((width - 4 - x) / 14, 0, 1));
              if (edgeFade < 0.08) continue;

              let bodyMask = 0;
              if (imgReady && gridCols && gridRows) {
                const gc = Math.round((x - px - drawX) / pitch);
                const gr = Math.round((y - py - scrollLiftY) / pitch);
                if (gc >= 0 && gc < gridCols && gr >= 0 && gr < gridRows) {
                  bodyMask = pixAlphaGrid[gr * gridCols + gc];
                }
              }

              const r = (1.1 + boost * 2.1) * edgeFade * (1 - bodyMask * 0.8) * bgScrollAlpha;
              if (r < 0.42) continue;

              const pushX = (vx / Math.max(1, dist)) * boost * 2.5;
              const pushY = (vy / Math.max(1, dist)) * boost * 2.5;
              hotPath.moveTo(x + pushX + r, y + pushY);
              hotPath.arc(x + pushX, y + pushY, r, 0, Math.PI * 2);
            }
          }

          ctx.fillStyle = night ? 'rgba(242, 95, 76, 0.68)' : 'rgba(201, 51, 38, 0.56)';
          ctx.fill(hotPath);
        }
      }
    }

    if (!imgReady || !gridCols || !gridRows || !portraitCtx) return;

    const maxR = pitch * 0.43;
    const introReady = clamp((introP - 0.55) / 0.45, 0, 1);
    const scrollFade = clamp(1 - scrollP * 1.35, 0, 1);
    const trailGate = reduced ? 0 : introReady * scrollFade;
    const hasTrail = trailGate > 0.015 && trail.length > 0;

    // 2. Render 0.5x Liquid Trail mask first so both portrait cutout & photo overlay stay box-free at any DPI
    if (hasTrail && maskCtx) {
      const maskScaleX = maskCanvas.width / width;
      const maskScaleY = maskCanvas.height / height;
      maskCtx.setTransform(maskScaleX, 0, 0, maskScaleY, 0, 0);
      maskCtx.clearRect(0, 0, width, height);
      maskCtx.globalCompositeOperation = 'lighter';
      for (let b = 0; b < trail.length; b++) {
        const blob = trail[b];
        const alpha = blob.life * trailGate;
        if (alpha < 0.015) continue;
        const g = maskCtx.createRadialGradient(blob.x, blob.y, blob.r * 0.15, blob.x, blob.y, blob.r);
        g.addColorStop(0, `rgba(0, 0, 0, ${alpha.toFixed(3)})`);
        g.addColorStop(0.55, `rgba(0, 0, 0, ${(0.72 * alpha).toFixed(3)})`);
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        maskCtx.fillStyle = g;
        maskCtx.beginPath();
        maskCtx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
        maskCtx.fill();
      }
      maskCtx.globalCompositeOperation = 'source-over';
    }

    // 3. Portrait Halftone: single pre-baked blit (plus mask destination-out when Liquid Trail active — zero boxes/clips)
    const canUseStaticPortrait = introP >= 0.998 && scrollP <= 0.005 && Boolean(basePortraitCtx);
    if (canUseStaticPortrait && !hasTrail) {
      ctx.drawImage(basePortraitCanvas, px, py, width, height);
    } else if (canUseStaticPortrait && hasTrail && maskCtx) {
      portraitCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      portraitCtx.clearRect(0, 0, width, height);
      portraitCtx.globalCompositeOperation = 'source-over';
      portraitCtx.drawImage(basePortraitCanvas, px, py, width, height);
      portraitCtx.globalCompositeOperation = 'destination-out';
      portraitCtx.drawImage(maskCanvas, 0, 0, width, height);
      portraitCtx.globalCompositeOperation = 'source-over';
      ctx.drawImage(portraitCanvas, 0, 0, width, height);
    } else {
      portraitCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      portraitCtx.clearRect(0, 0, width, height);

      const softPath = new Path2D();
      const midPath = new Path2D();
      const deepPath = new Path2D();

      for (let row = 0; row < gridRows; row++) {
        const ny = row / Math.max(1, gridRows - 1);
        const oy = row * pitch + pitch * 0.5;
        const staggerX = row & 1 ? pitch * 0.5 : 0;
        const rowOff = row * gridCols;

        let scrollScale = 1;
        if (scrollP > 0.005) {
          const dissolveWave = clamp(1 - (scrollP * 1.45 - (1 - ny) * 0.55), 0, 1);
          scrollScale = Math.pow(dissolveWave, 1.15);
        }

        for (let col = 0; col < gridCols; col++) {
          const idx = rowOff + col;
          const a = alphaGrid[idx];
          const tone = toneGrid[idx];
          if (a < 0.04 || tone < 0.05) continue;

          let pressScale = 1;
          if (introP < 0.998) {
            const nx = col / Math.max(1, gridCols - 1);
            const diag = (1 - nx) * 0.62 + ny * 0.38;
            const localP = clamp((introP - diag * 0.46) / 0.54, 0, 1);
            pressScale = 1 - Math.pow(1 - localP, 3);
          }

          const fx = drawX + col * pitch + staggerX + px;
          const fy = oy + py + scrollLiftY;

          let r = Math.min(maxR, tone * maxR * a * pressScale * scrollScale);
          if (hasTrail) {
            let erase = 0;
            for (let b = 0; b < trail.length; b++) {
              const blob = trail[b];
              const dist = Math.hypot(fx - blob.x, fy - blob.y);
              if (dist < blob.r) {
                const e = (1 - smoothstep(blob.r * 0.32, blob.r * 0.96, dist)) * blob.life * trailGate;
                if (e > erase) erase = e;
              }
            }
            if (erase > 0.94) continue;
            r *= 1 - erase;
          }

          if (r < 0.42) continue;

          const bucket = tone > 0.74 ? deepPath : tone > 0.32 ? midPath : softPath;
          bucket.moveTo(fx + r, fy);
          bucket.arc(fx, fy, r, 0, Math.PI * 2);
        }
      }

      if (night) {
        portraitCtx.fillStyle = 'rgba(242, 95, 76, 0.36)';
        portraitCtx.fill(softPath);
        portraitCtx.fillStyle = 'rgba(170, 178, 190, 0.78)';
        portraitCtx.fill(midPath);
        portraitCtx.fillStyle = 'rgba(228, 231, 236, 0.92)';
        portraitCtx.fill(deepPath);
      } else {
        portraitCtx.fillStyle = 'rgba(201, 51, 38, 0.26)';
        portraitCtx.fill(softPath);
        portraitCtx.fillStyle = 'rgba(58, 63, 74, 0.76)';
        portraitCtx.fill(midPath);
        portraitCtx.fillStyle = 'rgba(22, 24, 29, 0.92)';
        portraitCtx.fill(deepPath);
      }

      ctx.drawImage(portraitCanvas, 0, 0, width, height);
    }

    // 4. Organic Liquid Trail photo reveal composited cleanly at 1x resolution (no rectangular clip box)
    if (hasTrail && photoCtx && maskCtx && photoRect.dw > 0) {
      photoCtx.setTransform(1, 0, 0, 1, 0, 0);
      photoCtx.clearRect(0, 0, width, height);
      photoCtx.globalCompositeOperation = 'source-over';
      photoCtx.drawImage(
        img,
        drawX + photoRect.ox + px,
        photoRect.oy + py + scrollLiftY,
        photoRect.dw,
        photoRect.dh
      );

      photoCtx.globalCompositeOperation = 'destination-in';
      photoCtx.drawImage(maskCanvas, 0, 0, width, height);

      if (isDesktop) {
        const edgeGrad = photoCtx.createLinearGradient(pX, 0, pX + pW, 0);
        edgeGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        edgeGrad.addColorStop(0.08, 'rgba(0, 0, 0, 1)');
        edgeGrad.addColorStop(0.93, 'rgba(0, 0, 0, 1)');
        edgeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        photoCtx.fillStyle = edgeGrad;
        photoCtx.fillRect(pX, 0, pW, height);
      }

      const vEdgeGrad = photoCtx.createLinearGradient(0, 0, 0, height);
      if (isDesktop) {
        vEdgeGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vEdgeGrad.addColorStop(0.06, 'rgba(0, 0, 0, 0)');
        vEdgeGrad.addColorStop(0.2, 'rgba(0, 0, 0, 1)');
        vEdgeGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
      } else {
        vEdgeGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vEdgeGrad.addColorStop(0.12, 'rgba(0, 0, 0, 1)');
        vEdgeGrad.addColorStop(0.82, 'rgba(0, 0, 0, 1)');
        vEdgeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      photoCtx.fillStyle = vEdgeGrad;
      photoCtx.fillRect(0, 0, width, height);
      photoCtx.globalCompositeOperation = 'source-over';

      ctx.drawImage(photoCanvas, 0, 0, width, height);
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
    const stageW = isDesktop ? Math.min(width, 1440) : width;
    const stageX = isDesktop ? Math.round((width - stageW) * 0.5) : 0;
    pX = isDesktop ? stageX + Math.round(stageW * 0.4) : 0;
    pW = isDesktop ? Math.round(stageW * 0.6) : width;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    portraitCanvas.width = canvas.width;
    portraitCanvas.height = canvas.height;
    baseBgCanvas.width = canvas.width;
    baseBgCanvas.height = canvas.height;
    basePortraitCanvas.width = canvas.width;
    basePortraitCanvas.height = canvas.height;
    photoCanvas.width = width;
    photoCanvas.height = height;
    maskCanvas.width = Math.max(1, Math.ceil(width * 0.5));
    maskCanvas.height = Math.max(1, Math.ceil(height * 0.5));
    staticLayersDirty = true;

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
    if (trail.length > 0) return true;
    if (touchTween && touchTween.isActive()) return true;
    if (Math.abs(targetX - curX) > 0.15 || Math.abs(targetY - curY) > 0.15) return true;
    if (Math.abs(targetLightAlpha - lightAlpha) > 0.008) return true;
    if (Math.abs(targetParX - parX) > 0.05 || Math.abs(targetParY - parY) > 0.05) return true;
    return false;
  };

  const tick = (now: number) => {
    if (killed || !visible) {
      rafId = 0;
      lastTickTime = 0;
      return;
    }

    const dt = lastTickTime ? clamp((now - lastTickTime) / 1000, 0.004, 0.05) : 1 / 60;
    lastTickTime = now;

    const curEase = 1 - Math.exp(-dt * 11);
    const lightEase = 1 - Math.exp(-dt * 8.5);
    const parEase = 1 - Math.exp(-dt * 6.5);
    const headEase = 1 - Math.exp(-dt * 12);
    const trailDecay = Math.exp(-dt * 2.4);

    curX += (targetX - curX) * curEase;
    curY += (targetY - curY) * curEase;
    lightAlpha += (targetLightAlpha - lightAlpha) * lightEase;
    parX += (targetParX - parX) * parEase;
    parY += (targetParY - parY) * parEase;

    if (trail.length > 0) {
      const keepHead = targetLightAlpha > 0.5 || state.touchAlpha > 0.2;
      for (let i = trail.length - 1; i >= 0; i--) {
        if (i === 0 && keepHead) {
          trail[i].x = curX;
          trail[i].y = curY;
          trail[i].life += (1 - trail[i].life) * headEase;
        } else {
          trail[i].life *= trailDecay;
          if (trail[i].life < 0.02) {
            trail.splice(i, 1);
          }
        }
      }
    }

    draw();

    if (needsTick()) {
      rafId = window.requestAnimationFrame(tick);
    } else {
      rafId = 0;
      lastTickTime = 0;
    }
  };

  const wake = () => {
    if (killed || !visible) return;
    if (reduced) {
      draw();
      return;
    }
    if (!rafId) {
      lastTickTime = 0;
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

    const near = isNearPortrait(x, y);
    targetLightAlpha = near ? 1 : 0;

    if (near && !hintDismissed) {
      hintDismissed = true;
      lensHint?.setAttribute('data-dismissed', 'true');
    }

    if (near) {
      const head = trail[0];
      if (!head || Math.hypot(x - head.x, y - head.y) > 14) {
        trail.unshift({ x, y, life: 0.95, r: 84 });
        if (trail.length > 14) trail.pop();
      }
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

    const head = trail[0];
    if (!head || Math.hypot(x - head.x, y - head.y) > 14) {
      trail.unshift({ x, y, life: 0.95, r: 66 });
      if (trail.length > 10) trail.pop();
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

  const scheduleScrollDraw = () => {
    if (killed || !visible || scrollRaf) return;
    scrollRaf = window.requestAnimationFrame(() => {
      scrollRaf = 0;
      draw();
    });
  };

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
          scheduleScrollDraw();
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
          scheduleScrollDraw();
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
                lastTickTime = 0;
              }
            });
          },
          { threshold: 0.01 }
        )
      : null;
  io?.observe(hero);

  const mo = new MutationObserver(() => {
    staticLayersDirty = true;
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
    trail.length = 0;
    img.onload = null;
    if (rafId) window.cancelAnimationFrame(rafId);
    if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
    if (scrollRaf) window.cancelAnimationFrame(scrollRaf);
    rafId = 0;
    resizeRaf = 0;
    scrollRaf = 0;
    lastTickTime = 0;
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
