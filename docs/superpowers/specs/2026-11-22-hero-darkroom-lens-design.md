# Hero Section Redesign — Darkroom Halftone-to-Photo Lens

**Date:** 2026-11-22  
**Project:** Zarvaism Portfolio (`D:\Zarva\project\web\portfolio`)  
**Status:** Ready for Approval

---

## 1. Intent & The Why

The Hero (`#hero`) is the very first screen a visitor sees, and right now it undersells the craft demonstrated in the rest of the site:
- The pre-baked halftone PNGs (`hero-halftone-light.png` / `hero-halftone-dark.png`) flatten facial detail in Paper mode and create a harsh glowing oval in Night mode.
- The layout feels static and template-like: standard left-copy / right-floating-image with a placeholder caption (`HALFTONE / MY-PROFILE`) and a portrait that gets pushed below the mobile dock on small screens.
- The current headline is generic rather than memorable.

The owner wants visitors to feel genuinely **wowed in the first seconds** — not just by a larger portrait, but by a Hero that **proves engineering & interaction craft through three live moments** (inspired by NESH, Zamkara, and HeyDane without cloning any of them):
1. **On Load:** the Hero *happens* rather than appearing flat and static.
2. **On Cursor Move:** the stage reacts organically to pointer movement.
3. **On Scroll:** the Hero transforms cleanly into the next section rather than simply sliding upward.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- Deliver a signature **"Darkroom Halftone-to-Photo Lens"** Hero that unifies the top of the page visually with the **Halftone Dot Fire** already live in the footer (`ShellFooter.astro`).
- Put the original cinematic side-lit portrait (`src/assets/bg-image.jpg`, identical to `design/my-profile.png`) front and center in sharp clarity, feathered seamlessly into `--canvas` in both Paper (`#f3efe6`) and Night (`#12100e`) themes with zero hard rectangular border or Night-mode oval artifact.
- Choreograph all three interactive moments (**Load Exposure**, **Cursor Optical Lens + Reactive Dot Field**, **Scroll-Scrubbed Dispersion**) at smooth 60fps using existing dependencies (`gsap`, `ScrollTrigger`, Canvas 2D) with zero new npm packages.
- Make the Hero work purposefully on mobile viewports (`390×844` and up): portrait visible above the fold alongside headline/CTA, lightweight intro sweep, zero overlap with the mobile floating bottom dock, and never dimming readable copy on scroll.
- Preserve bilingual support (`en` / `id`), existing `SiteRail` (`60px` desktop spine), `Ticker`, magnetic CTAs, and vertical `odometer` stats.

### Non-Goals
- Do not install WebGL/Three.js, Spline, or heavy 3D libraries.
- Do not copy HeyDane's multi-agent cursor theater or NESH's neon-yellow glass cards verbatim; stay authentically within Zarvaism's Editorial Tactile design tokens.
- Do not redesign sections below `#hero` (`#about` through `#contact`) or alter the `SiteRail` navigation architecture.

### Anti-Goals (Failure Conditions)
- **Blocking preloader:** Intro must never trap the user behind a full-screen curtain or delay interactive CTAs beyond ~2 seconds. Scrolling early must immediately accelerate/yield the intro; revisiting `/` in the same session (`sessionStorage`) uses a snappy `0.55s` settle instead of replaying the full intro.
- **Unreadable copy:** The portrait, background wordmark, or halftone dots must never obscure the serif headline, subtitle, CTA buttons, or odometer stats in either Paper or Night mode.
- **Night-mode artifacting:** No white halo, hard oval mask, or dark rectangular seam against `#12100e` or `#f3efe6`.
- **Battery/CPU drain offscreen:** Canvas loop must pause completely when `#hero` leaves the viewport (`IntersectionObserver`) and automatically sleep when idle (only redrawing during intro, active pointer lerp settling, active scroll scrub, or theme toggle).

---

## 3. Constraints

- **Stack:** Astro 7 static site with `<ClientRouter />` View Transitions, Tailwind CSS v4, TypeScript, `gsap` + `ScrollTrigger` + `lenis`.
- **Dual Theme Tokens (`src/styles/global.css`):**
  - Paper (`:root` / `[data-theme='paper']`): `--canvas: #f3efe6`, `--ink: #14110f`, `--subtle: #6a6459`, `--brand: #b4552f`, `--signal: #5a6247`.
  - Night (`[data-theme='night']`): `--canvas: #12100e`, `--ink: #f2ede3`, `--subtle: #a39c8e`, `--brand: #d2724b`, `--signal: #8e9a76`.
- **View Transitions Lifecycle (`src/lib/motion/index.ts`):** Every listener, `requestAnimationFrame`, `ResizeObserver`, `IntersectionObserver`, `MutationObserver`, `gsap.matchMedia()`, and ScrollTrigger must register its teardown function in `cleanups` so `astro:before-swap` leaves zero leaks or zombie loops.
- **Accessibility:** Under `prefers-reduced-motion: reduce`, render the final crisp portrait immediately (with a static subtle halftone edge fade), skip the load animation, disable cursor lens & scroll dispersion, and keep all text/CTAs/odometers immediately visible.
- **No `transition-all` on GSAP-animated elements:** Only transition colors via CSS; transform/opacity stay owned by GSAP or canvas.

---

## 4. Approaches Considered

Three interactive prototypes were tested side-by-side in the browser (Paper & Night, Replay Intro, Cursor, Scroll):

1. **Approach A — Depth Editorial Stage (NESH × Editorial Clay)**
   - Full-bleed blurred-to-sharp portrait with giant `ZARVAISM` serif layered behind a subject cutout and floating glass stat pills reacting with 3-plane parallax; scatters & blurs on scroll.
   - *Trade-off:* Strong magazine-cover drama, but requires offline alpha subject masking and leans heavily on NESH's recognizable formula.

2. **Approach B — Live Blueprint & Compiler (HeyDane × Zamkara HUD)**
   - Architectural cursors (`TYPE`, `RENDER`) sweep redaction bars off the headline and laser-scan the portrait into view; full-screen X/Y crosshairs and framed portrait X-ray lens on hover; collapses into left rail on scroll.
   - *Trade-off:* Loudest "engineer showcase", but risks visual clutter on mobile and pulls the brand toward colder technical UI rather than warm editorial craft.

3. **Approach C — Darkroom Halftone-to-Photo Lens (Signature Zarvaism) — CHOSEN**
   - Full-height asymmetric split-bleed Hero where the real cinematic portrait crystallizes out of a live clay halftone dot field on load, reveals a smooth interactive halftone optical lens under the cursor (paired with subtle reactive dots across the open canvas), and gracefully dissolves back into rising halftone dots as the user scrolls down.
   - *Why chosen:* Most original, directly creates a visual bookend between the Hero and the footer's Halftone Dot Fire, fixes the broken Night-mode portrait permanently, and gives visitors an immediate tactile toy to explore with their cursor.

---

## 5. Decided Design

### 5.1 Composition & Responsive Architecture

- **Desktop (`>= lg` / `1024px`, `min-h-svh`):**
  - Full-width stage inside `#hero` (right of the `60px` `SiteRail`), topped by the quiet meta strip (`01 — MOBILE & FRONTEND DEVELOPER` on left; `● AVAILABLE FOR WORK` + `CV ↗` on right) and anchored at the bottom by the existing `Ticker`.
  - **Single Responsive Canvas (`<canvas data-hero-canvas>`):**
    - On `>= lg`, mounted full-stage (`lg:absolute lg:inset-0 lg:h-full lg:w-full`, `z-0`) spanning the area above the ticker:
      - Right ~58% holds the sharp cinematic portrait (`src/assets/bg-image.jpg`, optimized via Astro `getImage`), feathered smoothly into `--canvas` along its left, top, and bottom edges.
      - Left open canvas holds a subtle, sparse **reactive dot field** (Zamkara-inspired calm rhythm) that swells and warms toward `--brand` near the cursor.
  - **Quiet `ZARVAISM` Watermark *(builder call)*:**
    - Rendered as low-contrast DOM display typography (`Instrument Serif`, `pointer-events-none select-none`, hidden below `lg`), anchored along the **lower-left / lower-center open canvas** (`z-[1]`, `opacity: 0.06` in Paper, `opacity: 0.05` with subtle `mix-blend-soft-light` where it crosses the bottom shadow edge in Night). This avoids occlusion behind the opaque JPEG (`bg-image.jpg`) while echoing `ShellFooter.astro`'s cropped wordmark at rest.
  - **Foreground Copy Layer (`z-10`, left column ~46–50% max width):**
    - Headline with accented closing phrase, concise subtitle (`max-w-[30rem]`), primary solid + secondary ghost magnetic CTAs (`Explore Work` / `Get in touch`), and the 2 vertical odometer stats (`5+` Years craft, `8` Projects shipped).
    - Remove the `Halftone / my-profile` caption completely.
    - Whisper-quiet desktop-only mono cue near the portrait top-right (`HOVER LENS` / `ARAHKAN KURSOR`, fine-pointer only) that fades out permanently once the visitor has hovered the portrait for the first time.
- **Mobile (`< lg` / `< 1024px`) *(builder call)*:**
  - Single-column vertical flow prioritizing **Meta strip + Portrait Banner + Headline + Subtitle + Primary CTAs** cleanly inside the initial `~760px` clear area above `NavMenu.astro`'s fixed bottom dock (`390×844` baseline), letting the `5+ / 8` odometer stats and `Ticker` sit naturally right below the initial fold without artificial blank bottom padding above `#about`.
  - The same single `<canvas data-hero-canvas>` wrapper shifts in-flow (`relative aspect-[16/10] w-full`, ~`215px` tall on `390px`) right below the meta strip, rendering **portrait-only mode** (dropping the desktop left ambient dot field and desktop watermark) feathered softly top and bottom into `--canvas`.
  - Touch interaction on mobile: tapping or dragging across the portrait banner briefly blooms the halftone optical lens at the touch point and softly eases back to sharp photo on release.

### 5.2 Copy & i18n Schema *(pending confirmation of "pilih 2")*

- **EN:**
  - `hero.headline`: `Most apps stop when code works.`
  - `hero.headlineAccent`: `I don't.` *(rendered in `text-brand`)*
  - `hero.sub`: `Mobile & frontend engineer building Flutter and React products — from clean architecture to the last pixel of motion.`
- **ID:**
  - `hero.headline`: `Kebanyakan aplikasi berhenti saat kodenya jalan.`
  - `hero.headlineAccent`: `Saya tidak.` *(rendered in `text-brand`)*
  - `hero.sub`: `Mobile & frontend engineer yang membangun produk Flutter dan React — dari arsitektur bersih sampai detail interaksi terakhir.`
- Also update `site.headline` in `src/data/site.ts` to stay aligned.
- Because `prepareSplitWords()` in `reveals.ts` currently flattens `el.textContent`, update the Hero headline markup/splitter to preserve nested accent spans (`<span class="text-brand">`) as individual word-masked tokens.

### 5.3 The Three Signature Moments

#### Moment 1 — On Load: Darkroom Exposure + Masked Vertical Rise (~1.8s, skippable)
- **Unified Hero Intro Coordinator (`heroLens.ts`) *(builder call)*:**
  - `heroLens.ts` owns a single coordinated GSAP intro timeline for `#hero` (canvas exposure + headline masked word rise + eyebrow/sub/CTA stagger), while `reveals.ts` skips `#hero` elements marked `data-hero-managed` so there are no duplicate tweens.
  - `odometer.ts` exposes/accepts a quick-settle option or coordinates with the Hero session flag (`zarvaism:hero-seen`) so stats settle smoothly with the intro and fast-forward if skipped.
- **Canvas Exposure:** Starts at `exposure = 0` (crisp clay halftone dot matrix sampled from the portrait's luminance) and sweeps diagonally over `~1.55s` into `exposure = 1` (razor-sharp cinematic photo).
- **Headline Reveal *(owner choice: Masked vertical rise)*:** Words rise smoothly from clipped line masks (`overflow: hidden`) preserving the `text-brand` accent span, staggered cleanly over `~0.8s`, followed by subtitle, CTAs, and odometer stats.
- **Skip & Revisit Rules:**
  - If the user scrolls past `> 24px` during the intro, the unified intro timeline immediately fast-forwards (`timeScale(4)` / completes exposure) so scroll dispersion takes over cleanly without fighting.
  - Set `sessionStorage.setItem('zarvaism:hero-seen', '1')` after the first visit; intra-session revisits to `/` run a snappy `0.55s` reveal.

#### Moment 2 — On Cursor Move: Optical Halftone Lens + Reactive Dot Field (Desktop Fine Pointer)
- **Smooth pointer inertia:** Track `targetX / targetY` and lerp `currentX / currentY` + velocity-driven radius boost so the lens feels weighted and physical.
- **Over the Portrait:** Soft circular optical lens (`~125–150px` radius, feathered edge) masks out the sharp photo buffer (`destination-out` on a pre-allocated scratch canvas — never allocating per frame) to reveal **live crisp clay halftone dots** sampled from portrait luminance right under the pointer, with subtle velocity-linked micro-refraction (`1–3px`) and gentle micro-parallax (`<= 8px`).
- **Over the Open Left Canvas (`>= lg`):** Sparse ambient dot grid (`~24–28px` pitch, low resting opacity) swells in radius and shifts toward `--brand` within ~140px of the cursor.
- **Idle sleep:** When pointer lerp delta `< 0.15px` and neither intro nor scroll scrub is running, `rAF` pauses cleanly until the next `pointermove`, `scroll`, `resize`, or `data-theme` change.

#### Moment 3 — On Scroll: Viewport-Aware Scrubbed Reverse Exposure *(builder call)*
Implemented via `gsap.matchMedia()` so desktop and mobile behave naturally with **no pinning**:
- **Desktop (`(min-width: 1024px)`):**
  - Single `ScrollTrigger` on `#hero` (`start: 'top top'`, `end: 'bottom top'`, `scrub: true`).
  - `scrollProgress` (`0 → 1`) lowers `effectiveExposure` (`1 → ~0.12`), dissolving the sharp portrait back into clay halftone dots that drift upward (`scatterY` proportional to luminance & progress).
  - Foreground copy drifts gently upward with subtle fade (`1 → 0.25`) for layered depth.
  - Scrolling back up reverses everything seamlessly to the crisp photo.
- **Mobile (`(max-width: 1023px)`):**
  - Tighter `ScrollTrigger` attached **only to the portrait canvas slot** (`start: 'top 10%'`, `end: 'bottom top'`, `scrub: true`) so the banner visibly disperses into halftone dots as it scrolls off the top of the screen.
  - **No foreground copy/CTA/stats fade on mobile** — text, buttons, and stats stay 100% opaque and legible while scrolling down to read them.

### 5.4 Theme Adaptation (Paper vs. Night)

A `MutationObserver` on `document.documentElement` (`data-theme`) triggers an immediate re-render whenever Paper ↔ Night is toggled:
- **Paper Mode (`#f3efe6`):**
  - Portrait blends seamlessly into warm cream via pre-baked offscreen feathered mask and subtle warm tonal grade so the dark studio background integrates harmoniously with warm paper.
  - Halftone dots map **darker shadows → larger clay dots** (`#b4552f`, classic editorial print halftone).
- **Night Mode (`#12100e`):**
  - Portrait's dark backdrop melts invisibly into `#12100e` charcoal.
  - Halftone dots map **brighter highlights → larger glowing clay-amber dots** (`#d2724b` / `#e89a64`), directly echoing the footer's Night Halftone Dot Fire.

### 5.5 Files Affected & Lifecycle Integration

- **Modify:** `src/components/Hero.astro` — new responsive split-bleed markup, preloaded Astro-optimized portrait (`src/assets/bg-image.jpg`), single responsive `<canvas data-hero-canvas>` wrapper, quiet desktop `ZARVAISM` watermark, accent-aware headline markup, removed `HALFTONE / MY-PROFILE` label and old static halftone PNG imports.
- **Create:** `src/lib/motion/heroLens.ts` — Canvas 2D renderer (cached offscreen photo + luminance grid + reusable scratch buffer) + unified GSAP intro & `gsap.matchMedia()` scroll dispersion + touch bloom + theme/visibility/resize observers + complete teardown.
- **Modify:** `src/lib/motion/index.ts` — register `cleanups.push(initHeroLens())`.
- **Modify:** `src/lib/motion/reveals.ts` — preserve inline accent spans inside `[data-split]` (or support `[data-hero-managed]` handoff to `heroLens.ts`) and remove obsolete Hero `[data-reveal="screen"]` handling.
- **Modify:** `src/lib/motion/odometer.ts` — support fast revisit / hero intro skip synchronization cleanly.
- **Modify:** `src/lib/motion/tactile.ts` — remove obsolete `initPortraitParallax` (`[data-portrait]` removed).
- **Modify:** `src/i18n/index.ts` & `src/data/site.ts` — add `hero.headlineAccent` and updated EN/ID copy.

---

## 6. Left to the Builder

- Exact halftone grid pitch (`6–8px` desktop, `7–9px` mobile), dot radius curve, and ambient dot spacing/opacity tuning across 1x/2x DPR.
- Pre-allocated offscreen canvas caching (`photoBuffer`, `lensScratch`, pre-sampled luminance `Float32Array`) so per-frame draw calls stay well under 4ms at 60fps with zero GC churn.
- Subtle warm color grade on Paper mode so `bg-image.jpg`'s studio cyan highlight pairs naturally with `#f3efe6`.
- Exact GSAP easing curves, stagger values, and mobile touch-bloom decay duration.
- Verification via `npm run build` (`astro check && astro build`) + Playwright checks across desktop Paper, desktop Night, mobile (`390×844`), hover-lens canvas diff, scroll-dispersion canvas diff, offscreen pause, and `prefers-reduced-motion: reduce`.
