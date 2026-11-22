# Hero Section Redesign — Darkroom Halftone-to-Photo Lens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static halftone PNG Hero with a responsive, dual-theme **Darkroom Halftone-to-Photo Lens** Hero featuring three live moments (load exposure, cursor optical halftone lens + ambient dot ripple, and viewport-aware scroll dispersion) and sharper bilingual EN/ID copy.

**Architecture:** One responsive `<canvas data-hero-canvas>` inside `Hero.astro` renders an Astro-optimized cinematic portrait (`src/assets/bg-image.jpg`) backed by pre-allocated offscreen buffers and a pre-sampled luminance grid (`src/lib/motion/heroLens.ts`). A unified GSAP intro timeline coordinates canvas exposure, accent-preserving masked word rises, and odometer reels, while `gsap.matchMedia()` drives desktop full-hero scroll dispersion and mobile portrait-only dispersion with zero foreground copy fade.

**Tech Stack:** Astro 7 (`<ClientRouter />`), Tailwind CSS v4, TypeScript, GSAP 3 + `ScrollTrigger`, Canvas 2D, Playwright (verification).

**Spec:** [2026-11-22-hero-darkroom-lens-design.md](file:///D:/Zarva/project/web/portfolio/docs/superpowers/specs/2026-11-22-hero-darkroom-lens-design.md)

## Global Constraints

- Zero new npm dependencies (`gsap`, `ScrollTrigger`, `lenis`, and Canvas 2D only).
- Dual theme tokens verbatim from `src/styles/global.css`: Paper (`--canvas: #f3efe6`, `--ink: #14110f`, `--brand: #b4552f`) and Night (`--canvas: #12100e`, `--ink: #f2ede3`, `--brand: #d2724b`); immediate repaint on `data-theme` attribute mutation.
- Every listener, `requestAnimationFrame`, `ResizeObserver`, `IntersectionObserver`, `MutationObserver`, and `gsap.matchMedia()` context must register its teardown in `src/lib/motion/index.ts` `cleanups` for Astro View Transitions (`astro:before-swap`).
- Never place Tailwind `transition-all` on elements whose `transform` or `opacity` GSAP animates.
- `prefers-reduced-motion: reduce`: immediate crisp final portrait (static subtle halftone edge fade), no load sweep, no cursor lens, no scroll dispersion, all copy/CTAs/odometers immediately visible.
- `sessionStorage` key `zarvaism:hero-seen`: first load runs full ~`1.55s` exposure; intra-session revisits run snappy `0.55s` settle; scrolling `> 24px` during intro immediately fast-forwards/completes intro so scroll scrubbing never fights.
- Windows PowerShell 5.1 shell note: chain dependent shell commands with `; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE };` instead of `&&`.

## Review Focus

1. **Image already cached vs async decode (`img.complete`):** Returning to `/` or loading from cache can make the source image decoded synchronously before `onload` attaches; `heroLens.ts` must handle both cached and async decode cleanly without blank frames or `0×0` `getImageData` errors. (Pinned in Task 3 verification.)
2. **Inline accent span preservation inside `[data-split]`:** `prepareSplitWords()` previously flattened `el.textContent`, stripping `<span class="text-brand">`; it must preserve element classes per word and stay idempotent across repeated calls. (Pinned in Task 1 verification.)
3. **High-DPR (`devicePixelRatio = 2`) pointer-to-canvas alignment:** Lens hole masking on the scratch canvas and luminance grid lookup must stay in matching CSS-pixel space so the optical lens centers dead-on the pointer at both `1x` and `2x` DPR. (Pinned in Task 3 verification.)
4. **Early scroll during intro exposure:** Scrolling past `24px` mid-intro must immediately yield the intro exposure tween so ScrollTrigger dispersion never fights backward toward `exposure = 1`. (Pinned in Task 3 verification.)
5. **View Transitions round-trip (`/` → `/cv` → `/`):** Teardown on `astro:before-swap` must leave zero zombie `rAF` loops, zero console/page errors, and play the snappy `0.55s` revisit settle on return. (Pinned in Task 3 verification.)

---

### Task 1: Bilingual Hero Copy, Accent-Preserving Word Splitter & Odometer Coordination

**Files:**
- Modify: `src/i18n/index.ts:16-20,127-131`
- Modify: `src/data/site.ts:34`
- Modify: `src/lib/motion/reveals.ts:5-90`
- Modify: `src/lib/motion/odometer.ts:50-95`
- Test: `scripts/verifyherocopy.mjs` *(temporary check or merged into Task 3's Playwright suite — run via `astro check` + inline DOM unit test in node)*

**Interfaces:**
- Consumes: `isReducedMotion()` from `src/lib/motion/engine.ts`.
- Produces:
  - `TranslationKey` extended with `'hero.headlineAccent'` in `src/i18n/index.ts` (both `en` and `id`).
  - `prepareSplitWords(el: HTMLElement): void` exported from `src/lib/motion/reveals.ts` preserving inline element classes (e.g. `text-brand`) on wrapped `.word-inner` tokens while maintaining full `aria-label`.
  - `initReveals()` skips `#hero` elements carrying `data-hero-managed` so `heroLens.ts` owns the unified Hero intro timeline without duplicate tweens.
  - `initOdometers()` skips auto-running `#hero` odometers marked `data-hero-managed`, and exports `triggerHeroOdometers(options?: { fast?: boolean; instant?: boolean }): void` from `src/lib/motion/odometer.ts` so `heroLens.ts` can trigger, fast-forward on scroll skip, or snap on revisit.

- [ ] **Step 1: Update EN/ID Hero copy and add `hero.headlineAccent` in `src/i18n/index.ts` and `src/data/site.ts`**

  Exact copy from spec Section 5.2:
  - `en`:
    - `'hero.headline': 'Most apps stop when code works.'`
    - `'hero.headlineAccent': "I don't."`
    - `'hero.sub': 'Mobile & frontend engineer building Flutter and React products — from clean architecture to the last pixel of motion.'`
  - `id`:
    - `'hero.headline': 'Kebanyakan aplikasi berhenti saat kodenya jalan.'`
    - `'hero.headlineAccent': 'Saya tidak.'`
    - `'hero.sub': 'Mobile & frontend engineer yang membangun produk Flutter dan React — dari arsitektur bersih sampai detail interaksi terakhir.'`
  - `src/data/site.ts` line 34: `headline: "Most apps stop when code works. I don't.",`

- [ ] **Step 2: Export accent-preserving `prepareSplitWords` and add `data-hero-managed` handoff in `src/lib/motion/reveals.ts`**

  - Export `prepareSplitWords(el: HTMLElement): void`.
  - Walk `Array.from(el.childNodes)` instead of flattening `el.textContent`:
    - Capture full normalized text into `el.setAttribute('aria-label', fullText)`.
    - For text nodes, split whitespace-delimited words into `<span class="word" aria-hidden="true"><span class="word-inner" style="--i:N">word</span></span>` separated by spaces.
    - For inline element nodes (such as `<span class="text-brand">I don't.</span>`), keep the element's `className` on each generated `.word-inner` (or wrap each word inside a span preserving `child.className`) while incrementing the shared word index `--i`.
  - In `initReveals()`:
    - For `[data-split]` inside `#hero`: if `el.hasAttribute('data-hero-managed')`, call `prepareSplitWords(el)` (and add `is-in` immediately if `reduced`), then return without scheduling `rAF` `is-in` so `heroLens.ts` triggers it in sync with canvas exposure.
    - In section 2 (`#hero` choreography): exclude elements with `data-hero-managed`, and remove the obsolete `[data-reveal="screen"]` branch for `#hero`.

- [ ] **Step 3: Export `triggerHeroOdometers` from `src/lib/motion/odometer.ts`**

  - Keep a module-level list of Hero odometer slot groups reset cleanly on each `initOdometers()` call.
  - When an odometer element inside `#hero` has `data-hero-managed`:
    - Build its DOM slots, set `yPercent: 0` (or final `-s.current * 10` immediately when `reduced`), and register its slots without auto-starting `run()`.
  - Export `triggerHeroOdometers(opts?: { fast?: boolean; instant?: boolean }): void`:
    - `instant: true` → `gsap.set(s.strip, { yPercent: -s.current * 10 })` (used on scroll skip or reduced motion).
    - `fast: true` → `duration: 0.45`, `delay: i * 0.04` (used on `sessionStorage` revisit).
    - default → `duration: 0.95`, `delay: 0.12 + i * 0.06`, `ease: 'power3.out'`, `overwrite: 'auto'`.
  - Non-Hero odometers (and Hero odometers without `data-hero-managed`) keep existing behavior untouched.

- [ ] **Step 4: Run typecheck to verify Task 1 compiles cleanly**

  Run: `npm run check`
  Expected: `0 errors`, `0 warnings` from `astro check`.

---

### Task 2: Responsive Split-Bleed Hero Markup & Optimized Portrait Asset

**Files:**
- Modify: `src/components/Hero.astro:1-148`
- Modify: `src/lib/motion/tactile.ts:110-145,215-225`

**Interfaces:**
- Consumes:
  - `tr['hero.headline']`, `tr['hero.headlineAccent']`, `tr['hero.sub']` from `src/i18n/index.ts` (Task 1).
  - `src/assets/bg-image.jpg` optimized via `getImage({ src: heroPhoto, format: 'webp', width: 1400, quality: 86 })` from `astro:assets`.
- Produces (DOM contract consumed by Task 3 `src/lib/motion/heroLens.ts`):
  - `#hero` section with `data-hero-stage` wrapping everything above the bottom `Ticker`.
  - `[data-hero-canvas-wrap]` single responsive container:
    - Mobile (`< lg`): in-flow `relative aspect-[16/10] w-full overflow-hidden` directly below the top meta strip and above the headline.
    - Desktop (`>= lg`): `lg:pointer-events-none lg:absolute lg:inset-0 lg:z-0 lg:aspect-auto lg:h-full lg:w-full`.
  - `<canvas data-hero-canvas data-hero-src={optimizedPortrait.src} class="block h-full w-full" aria-hidden="true"></canvas>` inside `[data-hero-canvas-wrap]`, paired with a visually hidden `<img data-hero-source src={optimizedPortrait.src} alt="" aria-hidden="true" loading="eager" fetchpriority="high" decoding="async" class="sr-only" />` so the browser preloads and decodes the portrait at LCP priority.
  - Quiet desktop-only `ZARVAISM` watermark (`hidden lg:block pointer-events-none select-none`) anchored along lower-left/lower-center (`z-[1]`, `opacity-[0.06]` Paper / `opacity-[0.05] mix-blend-soft-light` Night).
  - `[data-hero-eyebrow data-hero-managed]` top meta strip (`01 — MOBILE & FRONTEND DEVELOPER` + availability + `CV ↗`).
  - `[data-hero-copy]` container (`relative z-10`) holding:
    - `<h1 class="display ..." data-split data-hero-managed>{tr['hero.headline']} <span class="text-brand">{tr['hero.headlineAccent']}</span></h1>`
    - `[data-hero-sub data-hero-managed]`, `[data-hero-cta data-hero-managed]`, `[data-hero-stats data-hero-managed]` with `[data-odometer={stat.value} data-hero-managed]`.
  - Whisper-quiet desktop-only `[data-hero-lens-hint]` (`HOVER LENS` in EN / `ARAHKAN KURSOR` in ID) shown only on `(hover: hover) and (pointer: fine)` at `lg:block`, hidden on touch devices.

- [ ] **Step 1: Rewrite `src/components/Hero.astro` to the split-bleed Darkroom Lens markup**

  - Replace `halftoneLight` / `halftoneDark` PNG imports with `bgImage` (`../assets/bg-image.jpg`) processed through `getImage`.
  - Remove the `Halftone / my-profile` caption completely and remove old `.halftone` crossfade CSS.
  - Structure `#hero` so on mobile (`390×844`) the vertical rhythm stays tight:
    - Compact top padding (`pt-5 sm:pt-10 lg:pt-12`), compact meta strip (`mb-4 sm:mb-8 lg:mb-12`), `aspect-[16/10]` portrait slot (`mb-5 lg:mb-0`), `text-[2.35rem] leading-[1.02] sm:text-[3.75rem] lg:text-[4.85rem]` headline, concise subtitle (`mt-4 sm:mt-6`), magnetic CTAs (`mt-6 sm:mt-8`), odometer stats (`mt-8 sm:mt-11`), followed by `<Ticker>` cleanly below without artificial blank gap above `#about`.
  - Add scoped `<style>` rules:
    - `.hero-lens-hint` hidden by default on coarse pointers (`@media (hover: none), (pointer: coarse) { display: none; }`) and transitions `opacity` only (`transition: opacity 360ms ease`) when `[data-dismissed='true']`.
    - `.hero-watermark` low-opacity styling for Paper & Night (`:global(:root[data-theme='night']) .hero-watermark { opacity: 0.055; mix-blend-mode: soft-light; }`).
  - Keep `<noscript>` fallback image inside `[data-hero-canvas-wrap]` so non-JS visitors still see the portrait cleanly.

- [ ] **Step 2: Remove obsolete `initPortraitParallax` from `src/lib/motion/tactile.ts`**

  - Delete `initPortraitParallax` (`lines 110-145`) and its invocation in `initTactile()` (`line 219`), since `[data-portrait]` no longer exists and subtle portrait parallax moves into `heroLens.ts`.

- [ ] **Step 3: Build & verify static output**

  Run: `npm run build`
  Expected: `astro check` reports `0 errors`, `0 warnings`, and `astro build` completes cleanly with the optimized WebP portrait generated in `dist/_astro/`.

---

### Task 3: Darkroom Halftone-to-Photo Lens Engine (`heroLens.ts`), Lifecycle Wiring & Full Verification

**Files:**
- Create: `src/lib/motion/heroLens.ts`
- Modify: `src/lib/motion/index.ts:1-58`
- Create: `scripts/verifyherolens.mjs` *(Playwright verification gate for Hero Darkroom Lens)*

**Interfaces:**
- Consumes:
  - `isReducedMotion()`, `prefersFinePointer()` from `src/lib/motion/engine.ts`.
  - `prepareSplitWords` from `src/lib/motion/reveals.ts` (Task 1).
  - `triggerHeroOdometers` from `src/lib/motion/odometer.ts` (Task 1).
  - DOM elements from `src/components/Hero.astro` (Task 2): `#hero`, `[data-hero-stage]`, `[data-hero-canvas-wrap]`, `[data-hero-canvas]`, `[data-hero-source]`, `[data-hero-copy]`, `[data-hero-lens-hint]`, `[data-hero-managed]`.
- Produces:
  - `export function initHeroLens(): () => void` registered in `src/lib/motion/index.ts`.

- [ ] **Step 1: Implement `src/lib/motion/heroLens.ts`**

  Organize cleanly into focused internal sections within `heroLens.ts`:
  1. **Pre-allocated Offscreen Buffers & Luminance Cache (`rebuildBuffers()`):**
     - Reuse persistent offscreen canvases: `photoCanvas` (feathered portrait sized to current canvas CSS width/height), `lensScratch` (same dimensions, used for `destination-out` optical lens mask with zero per-frame allocations), and `lumGrid: Float32Array` (luminance sampled once per halftone grid cell on resize/theme/decode — avoiding `getImageData` during animation frames!).
     - Determine desktop vs mobile layout mode from `window.matchMedia('(min-width: 1024px)').matches`:
       - **Desktop (`>= 1024px`):** portrait occupies right ~`60%` of stage width (`pX = Math.round(w * 0.40)`, `pW = w - pX`), feathered seamlessly into transparent along its left ~`44%` width and subtle top/bottom edges; Paper mode applies a gentle warm clay-compatible tonal curve (`sepia(0.14) saturate(0.92) contrast(1.04)`) via `ctx.filter` during offscreen bake so studio cyan integrates warmly with `#f3efe6`; Night mode keeps rich charcoal shadows seamlessly melting into `#12100e`.
       - **Mobile (`< 1024px`):** portrait fills `100%` of the `16/10` canvas slot, centered on the face (`object-position` equivalent ~`50% 20%`), feathered gently at top & bottom edges (`18%` gradient mask).
     - Handle both already-decoded cached images (`sourceImg.complete && sourceImg.naturalWidth > 0`) and async load (`sourceImg.decode()` / `onload`). Guard against `0×0` dimensions on hidden/swapping frames.
  2. **Halftone & Optical Lens Renderer (`draw()`):**
     - All coordinates in CSS pixels (`ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`), keeping `1x` and `2x` DPR pointer alignment exact.
     - **Desktop left reactive dot grid (`>= 1024px`):** sparse grid (`26px` pitch) across `x < pX + pW * 0.25`; quiet resting dots (`r = 1.05`, low alpha) swell smoothly up to `r = 3.2` and shift toward `--brand` within `145px` of the lerped pointer.
     - **Feathered photo layer (`effectiveExposure > 0.015`):**
       - Copy `photoCanvas` onto `lensScratch` (applying `<= 8px` micro-parallax offset on desktop), punch a soft radial `destination-out` hole at `(lensX, lensY)` when `lensAlpha > 0.01` (desktop fine pointer hovering portrait OR mobile touch bloom active), then composite onto main canvas at `globalAlpha = effectiveExposure`.
     - **Live crisp halftone dot layer (batched `Path2D` for 60fps):**
       - Halftone grid pitch: `7px` desktop, `8px` mobile; staggered alternate rows (`y & 1 ? pitch / 2 : 0`) matching footer Halftone Dot Fire.
       - Compute per-dot visibility from:
         - Diagonal darkroom exposure wave (`introProgress < 1`),
         - Scroll dispersion (`scrollProgress > 0`, lifting dots upward `scatterY = -scrollProgress * 44 * (0.35 + lum)`),
         - Optical lens mask (`dist < lensRadius` → smooth radial strength + `1–3px` velocity-driven micro-refraction displacement).
       - Theme tone mapping:
         - Paper (`data-theme !== 'night'`): darks → larger `#b4552f` terracotta dots (`tone = 1 - lum * 0.9`).
         - Night (`data-theme === 'night'`): highlights → larger `#d2724b` / `#e89a64` glowing amber-clay dots (`tone = lum`).
       - Reduced motion (`reduced === true`): render crisp `effectiveExposure = 1` photo with a subtle static halftone edge fade (`14%` along left feather on desktop), zero animation loop.
  3. **Moment 1 — Unified Intro Timeline & Revisit / Skip Logic:**
     - Check `sessionStorage.getItem('zarvaism:hero-seen') === '1'` to choose full (`1.55s` exposure) vs snappy revisit (`0.55s` exposure).
     - Build one GSAP timeline (`introTl`) driving `state.introProgress` (`0 → 1`), adding `is-in` on `#hero [data-split][data-hero-managed]`, staggering `[data-hero-eyebrow]`, `[data-hero-sub]`, `[data-hero-cta]`, `[data-hero-stats]` (`y: 16 → 0, opacity: 0 → 1, clearProps: 'transform'`), and calling `triggerHeroOdometers({ fast: isRevisit })`.
     - Attach passive `scroll` listener during intro: if `window.scrollY > 24` before `introTl` completes, immediately fast-forward `introTl.progress(1)` and call `triggerHeroOdometers({ instant: true })`, then remove the skip listener.
     - Mark `sessionStorage.setItem('zarvaism:hero-seen', '1')` once intro starts/completes (wrapped in `try/catch` for private browsing safety).
  4. **Moment 2 — Pointer Inertia, Touch Bloom & Idle Sleep:**
     - Desktop fine pointer: track `pointermove` on `#hero` (`targetX/Y`), smoothly lerp `currentX/Y` and `lensAlpha` (`0 → 1` when pointer is over portrait bounds, `→ 0` on leave), dismiss `[data-hero-lens-hint]` (`data-dismissed="true"`) on first portrait hover.
     - Mobile touch (`!prefersFinePointer()`): on `pointerdown` / `pointermove` inside `[data-hero-canvas-wrap]`, set lens center and tween `lensAlpha → 1`, then on `pointerup` / `pointercancel` ease `lensAlpha → 0` over `0.65s`.
     - **Idle sleep:** `requestAnimationFrame` runs only while `visible && !killed && needsTick()` (intro running, pointer lerp not settled `< 0.15px`, touch bloom decaying, or scroll scrub changed). Any `pointermove`, `scroll`, `resize`, or `data-theme` change calls `wake()`.
  5. **Moment 3 — Viewport-Aware Scroll Dispersion (`gsap.matchMedia()`):**
     - `(min-width: 1024px)`: `ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', scrub: true, onUpdate })` updates `state.scrollProgress = self.progress`, wakes canvas draw, and scrubs `[data-hero-copy]` (`y: -36 * p`, `opacity: 1 - p * 0.72`).
     - `(max-width: 1023px)`: `ScrollTrigger.create({ trigger: canvasWrap, start: 'top 10%', end: 'bottom top', scrub: true, onUpdate })` updates `state.scrollProgress = self.progress` for the portrait banner only — **never fades or shifts `[data-hero-copy]`**.
  6. **Observers & Complete Teardown:**
     - `ResizeObserver` on `[data-hero-canvas-wrap]` (debounced via rAF).
     - `IntersectionObserver` on `#hero` (`threshold: 0.01`) pausing `rAF` when offscreen.
     - `MutationObserver` on `document.documentElement` (`attributeFilter: ['data-theme']`) re-baking Paper/Night `photoCanvas` and redrawing immediately.
     - Return cleanup function canceling `rAF`, killing `introTl`, reverting `mm`, removing all listeners, disconnecting all 3 observers.

- [ ] **Step 2: Register `initHeroLens()` in `src/lib/motion/index.ts`**

  - Import `initHeroLens` from `./heroLens`.
  - Inside `bootMotion()` `gsap.context(...)`, call `cleanups.push(initHeroLens());` right after `initOdometers()` so Hero odometers are registered and ready for `heroLens.ts` to coordinate.

- [ ] **Step 3: Write Playwright verification suite `scripts/verifyherolens.mjs`**

  Must assert all spec requirements & all 5 Review Focus items against `http://localhost:4322`:
  - `accentSpanPreserved`: `#hero h1 .word-inner.text-brand` exists and contains `"I"` / `"don't."` (and `"Saya"` / `"tidak."` on `/id`), with full `aria-label` intact.
  - `loadExposureAnimates`: canvas pixel hash changes from early load (`t=150ms`) to settled (`t=2000ms`), and non-zero portrait pixels are drawn.
  - `earlyScrollSkipsIntro`: fresh context that immediately scrolls to `y=140` at `t=150ms` settles `[data-hero-copy]` opacity cleanly without fighting back to `exposure=1`.
  - `cursorLensActive2xDPR`: in `deviceScaleFactor: 2` desktop context, moving pointer into right portrait half changes canvas pixels right at pointer coordinates (and dismisses `[data-hero-lens-hint]`).
  - `desktopScrollDispersion`: scrolling `#hero` to `50%` changes canvas pixel hash and fades `[data-hero-copy]` subtly; scrolling back to `0` restores `opacity === 1`.
  - `themeSwitchImmediate`: toggling `data-theme="night"` updates canvas pixels immediately; captures visual screenshots for Paper (`desktop`), Night (`desktop`), Hover Lens (`desktop`), Scroll Dispersion (`desktop`), and Mobile (`390×844` Paper & Night).
  - `mobileLayoutAndNoCopyFade`: at `390×844`, portrait canvas bottom + primary CTA bottom sit cleanly above the bottom dock (`y < 785`), and scrolling `220px` disperses the portrait canvas while keeping `[data-hero-copy]` `opacity === 1`.
  - `offscreenIdleSleep`: scrolling to `#contact` pauses hero canvas (`hash0 === hash1` over `600ms`).
  - `reducedMotionStatic`: with `reducedMotion: 'reduce'`, portrait is immediately drawn (`nonZero > 0`), copy is `opacity === 1`, and hovering/scrolling causes zero animation errors.
  - `viewTransitionRoundTrip`: navigating `/` → `/cv` → `/` via click leaves `0` console/page errors and cleanly re-initializes the hero canvas with snappy revisit (`sessionStorage` set).

- [ ] **Step 4: Run build and Playwright verification, then visually inspect screenshots**

  Run:
  ```powershell
  npm run build; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; $srv = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx astro preview --port 4322" -PassThru -WindowStyle Hidden; try { $ready = $false; for ($i = 0; $i -lt 30; $i++) { try { $r = Invoke-WebRequest -Uri "http://localhost:4322/" -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { $ready = $true; break } } catch {}; Start-Sleep -Milliseconds 300 }; if (-not $ready) { throw "Preview server failed to start" }; node scripts/verifyherolens.mjs } finally { if ($srv) { taskkill /PID $srv.Id /T /F 2>$null | Out-Null } }
  ```
  Expected: `0 errors`, `0 warnings`, all Playwright assertions `PASS`, `errors: []`, and visual inspection of desktop Paper, desktop Night, hover lens, and mobile `390×844` screenshots confirms crisp portrait blending, readable copy, and zero artifacts.

- [ ] **Step 5: Commit after user confirmation**

  *(Hold commit until user previews/approves the live result, per session commitment.)*
