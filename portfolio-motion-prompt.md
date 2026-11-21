# PROMPT — Replikasi Sistem Transisi Animasi Section Portfolio (Astro + GSAP + Lenis)

Paste seluruh isi blok `PROMPT` di bawah ke AI agent Anda.

---
---

## PROMPT

Kamu adalah frontend engineer motion. Tugasmu: **membangun sistem animasi transisi section-by-section untuk website portofolio saya**, dengan pola interaksi yang **dipetakan dari tiga referensi**:

- https://heynesh.com (Webflow + GSAP full plugin suite + Lenis + ScrollSmoother)
- https://heydane.framer.website (Framer — reveal + grid motion)
- https://zamkara.dev (canvas/WebGL + sticky storytelling)

---

### 0. KONTEKS PROYEK (WAJIB DIBACA DULU)

Repo saya: **Astro 7 + Tailwind 4**, TypeScript strict, tanpa framework UI runtime.
Root project `D:\Zarva\project\web\portfolio`.

Struktur yang sudah ada (jangan diubah strukturnya):
```
src/views/Home.astro        -> urutan section: Hero, About, Disciplines,
                               ExperienceTimeline, FeaturedProjects,
                               OtherProjects, Contact
src/components/Hero.astro
src/components/About.astro
src/components/Disciplines.astro
src/components/ExperienceTimeline.astro
src/components/FeaturedProjects.astro
src/components/OtherProjects.astro
src/components/Contact.astro
src/components/IntroCurtain.astro
src/components/FloatingNav.astro
src/components/TransitionSquare.astro
src/components/RevealHeading.astro
src/components/BlurImage.astro
src/layouts/Page.astro
src/layouts/Base.astro
```

**PENTING — inventory dulu sebelum nulis kode.** Baca `src/components/*.astro` dan
`src/layouts/*.astro` yang sudah ada, dan **dipakai ulang**. JANGAN membuat sistem
animasi kedua yang bentrok dengan `IntroCurtain`, `TransitionSquare`,
`RevealHeading`, `BlurImage`, `FloatingNav` yang sudah ada. Kalau komponen
tersebut sudah mengimplementasikan suatu efek, **perbaiki/upgrade**, jangan
duplikasi.

**Belum ada dependency motion.** Kamu WAJIB menambah:
- `gsap` (>= 3.13, sudah termasuk SplitText & ScrollTrigger gratis)
- `lenis` (smooth scroll)
- opsional `gsap/ScrollToPlugin`, `gsap/Flip` (bukan club plugin)

JANGAN menambah framer-motion / anime.js / locomotive — jangan campur engine.

Dev server: `astro dev --background` (lihat AGENTS.md). Kelola dengan
`astro dev status` / `astro dev logs` / `astro dev stop`.

---

### 1. TEMUAN ANALISIS — APA YANG SEBENARNYA BERJALAN DI 3 SITUS REFERENSI

Ini hasil pengukuran langsung (bukan tebakan). Patuhi.

#### A. heynesh.com — stack: Webflow + GSAP (core, SplitText, ScrollTrigger, Flip, ScrollToPlugin, ScrollSmoother, MotionPath, DrawSVG) + Lenis + Swiper

Hasil introspeksi: **163 ScrollTrigger aktif, 0 `pin`, 0 `scrub`**. Ini informasi
penting — situs ini **tidak** memindai posisi scroll untuk drives. Semua
animasi **berbasis toggle state** dengan durasi ~0.5s. `html.lenis` aktif
(scroll smoothing). Sembilan trigger teragregasi:

| Trigger | Jumlah | Perilaku |
|---|---|---|
| `.hero` | 63 | Timeline masuk: 63 trigger terpisah untuk tiap elemen (h1, sub, CTA, stats, image, ticker), masing-masing 0.5s, `once:true`, tanpa scrub |
| `.about-card-container` | 69 | Kartu perjalanan (7 kartu, 2 gambar + 1 caption masing-masing): **69 trigger**. Tiap card punya state `scale(0.6) translateY(+28…52px) opacity:0` → `scale(1) translateY(0) opacity:1`. Terukur persis: kartu aktif `opacity 0.8122 → 0.9539 → 0.993 → 0.9995`, `matrix(0.6)→(0.9249)→(0.9816)→(0.9972)→(0.9998)`. Kartu berikutnya **stagger 1 tingkat** (`opacity 0.0843`, `0.7378`, `0.9399`) |
| `A.work-card` | 7 | Kartu proyek: default `scale(0.6) translateY(52.1px) opacity:0`, aktif membesar ke `scale(0.9083)` lalu `1` |
| `.work-sticky` | 3 | Wrapper **sticky** (CSS `position:sticky`, bukan GSAP `pin`) |
| `.what_you_get-text` | 7 | CopyCapabilities, 7 trigger |
| `.column` | 7 | Layout kolom |
| `SECTION.about-section`, `SECTION.work_section`, `.cta-wrap` | 7 | |

Pola yang harus ditiru:
1. **Tidak ada satu pun scroll-scrubbed animation.** Semua berbobot
   "flip state saat element masuk viewport" → **`toggleActions` / `once`**.
   Ini jauh lebih ringan dan tidak bikin captive scroll.
2. **State awal selalu kelihatan sebagai "kecil + turun + transparan"**:
   `opacity: 0; transform: scale(0.6) translateY(30–52px)`.
   Dan **`visibility` TIDAK pernah `hidden`** — element tetap occupy space
   (verified: semua `visibility:visible` sepanjang scroll).
3. **Urutan aktif = 1, sebelum = 1, sesudah = 2.** Bukan reveal-and-hide;
   kartu aktif berada di tengah skala, kartu sebelum & sesudah tetap di layar
   dengan skala berbeda. Ini yang bikin stagger terasa hidup.
4. **Hero = 63 trigger terpisah, durasi 0.5s.** Bukan satu timeline besar.
   Satu timeline besar = 1 frame/layout flush; 63 trigger kecil = spread cost
   dan tiap elemen punya timing sendiri.
5. **Sticky lewat CSS**, `ScrollTrigger` hanya mendeteksi.

#### B. heydane.framer.website — stack: Framer + custom JS, canvas background

- Framer Motion (bundled, tidak ada di `window`), 4 canvas, 1 iframe
  (embed kalender events).
- **Zero scroll-linked transform di DOM** yang terukur saat scrollTo.
- Yang terlihat nyata:
  - Sticky blue header (`position: sticky`, tinggi ~40px, `z-10`)
  - **Dotted grid / particle canvas background** di section "Creative &
    Technologist" — ribuan titik biru yang *berkumpul* membentuk awan/pola,
    lalu aligned ke grid garis biru tua
  - **Dual-font section headings**: baris 1 serif besar (`MILESTONES OF
    LEARNING`, `EMPOWERING FUTURE MINDS`) + baris 2/glyph grotesque
    uppercase biru (`TECHNOLOGIST`, `OF LEARNING`). Ini signature visual
    terkuatnya.
  - **Lime-green (#A3E635-ish) pill badge** dengan ikon kotak kecil, di atas
    setiap heading
  - Card list: `border-radius ~12px`, `bg white`, `shadow-[0_2px_12px_rgba(0,0,0,.06)]`,
    border `1px #E5E7EB`, hover lift
  - Filter chip bar abu-abu (`Social Narrative` / `2D and 3D` / …) — state
    filter aktif = chip putih + shadow
  - Testimoni: card **hanya terlihat saat masuk viewport**, tanpa motion berarti
  - Footer form: input `bg #F3F4F6`, radius 8, submit button full-width lime
    green

#### C. zamkara.dev — stack: SPA (vanilla bundle `index-C8n1KA_9.js`)

- **Tidak ada GSAP, tidak ada Lenis, tidak ada scroll-driven animation
  (`animation-timeline: view()/scroll()` = 0 element)**.
- 5 canvas: 1 × 2D particle di hero (1920×1160), **2 × WebGL2** (982×1262
  di hero, 2× 751×611 di section brand), 1 × 2D marquee di `y≈8001`.
- Yang terukur berubah saat scroll:
  - Header `fixed` dengan `transform: translateY(0 → -104px)` lalu **clamp
    (hilang)**, menetap di -104px. Progress bar site thin di wrapper
    `h-(--site-header-height)`.
  - Body `overflow: clip visible` → browser-native scroll, **tanpa smoothing**.
- Section yang harus ditiru:
  - **Hero canvas 2D particle** (`absolute inset-0 z-0`) — dan teks berada
    di `z-10` di atasnya
  - **Brand logo wall**: 7 logo dirender dua kali (row atas scroll ke kanan,
    row bawah scroll ke kiri / arah berlawanan) → marquee bolak-balik
    (*infinite dual-row opposite-direction marquee*)
  - **Angka odometer counter** `01234567890123456789+` → digit ROW BERJALAN
    vertikal, bukan `textContent` count-up. Row digits yang sama diulang
    2×, di-animate `translateY(0 → -50%)` loop = odometer digit-roll. Ini
    teknik wajib tiru, sangat murah dan sangat khas.
  - **Horizontal "THE WORKFLOWS / How I work." dengan `Scroll to move →`** —
    section carousel horizontal yang digerakkan pointer (pointer-driven
    horizontal track), bukan scroll vertikal
  - **Step cards berurutan** dengan angka `01–04`, gambar landscape
  - FAQ satu baris penuh dengan `+` yang **rotates 90° → 45°** saat open
    (`+` → `×` via CSS `transform: rotate`, plus grid-rows expand)

---

### 2. ARSITEKTUR YANG HARUS DIBANGUN

```
src/lib/motion/
  engine.ts        — bootstrap GSAP + Lenis + ScrollTrigger + reduced-motion
  presets.ts       — token easing/durasi + factory Reveal(), Stagger(), FlipState()
  index.ts         — re-export tunggal
src/components/motion/   ( kalau butuh wrapper )
```
Semua komponen `.astro` mengimpor **hanya** dari `src/lib/motion/index.ts`.
Tidak ada `gsap` import langsung di dalam `.astro`.

#### 2.1 `engine.ts` wajib
```ts
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);
```
Wajib_call sekali, idempoten (aman dipanggil ulang):
1. `gsap.config({ nullTargetWarn: false })`
2. `ScrollTrigger.config({ ignoreMobileResize: true })`
3. Lenis dengan konfigurasi WAJIB:
   `lerp: 0.1, wheelMultiplier: 1, smoothWheel: true`
4. Sinkronkan dua arah (WAJIB, kalau tidak scroll-nya Governing
   ```ts
   lenis.on('scroll', ScrollTrigger.update);
   gsap.ticker.add((t) => lenis.raf(t * 1000));
   gsap.ticker.lagSmoothing(0);
   ```
5. `astro:after-swap` → `ScrollTrigger.refresh()` untuk halaman lain
6. **Reduced motion (WAJIB, ini bukan opsional):**
   ```ts
   const mq = matchMedia('(prefers-reduced-motion: reduce)');
   mq.addEventListener('change', apply);   // apply: matikan Lenis
                                            // + gsap.globalTimeline.timeScale(100)
   ```
   Saat reduced-motion aktif: Lenis dimatikan, semua elemen langsung
   ke state akhir (`opacity:1, scale:1, translateY:0`), **tidak ada** yang
   blank.

#### 2.2 `presets.ts` WAJIB punya
```ts
export const EASE   = { out:'expo.out', inOut:'power3.inOut', soft:'power2.out', flip:'power3.out' };
export const DUR    = { micro:0.35, state:0.5, enter:0.8, curtain:1.0 };
// 0.5s state + once:true + toggleActions = profil persis heynesh.com
export const IDLE   = { opacity:0, scale:0.6, y:34 };
```
Fungsi:
- `reveal(target, opts?)` — IDLE → state akhir, `once: true`,
  `toggleActions: 'play none none none'`, durasi `DUR.state`
- `staggerCards(cards, { activeClass, activeScale })` — **3-lapis** seperti
  heynesh: kartu aktif `scale 1 opacity 1`; kartu tepat sebelum & sesudah
  `scale 0.88 opacity 0.45`; sisanya IDLE. Transisi antar-kartu **0.35s**
  pakai `EASE.soft`, di-`interrupt`-safe.
- `splitLines(el)` — `SplitText` `type:'lines,words'`,
  `mask:'lines'`, `autoSplit:true` (WAJIB, SplitText v3.13+ wajib
  `revert()` saat re-run — kalau tidak, teks jadi duplikat saat resize)
- `counterOdometer(el, value)` — teknik zamkara, bukan `textContent` count-up

---

### 3. PER-SPEC SECTION — SALIN POLA, KEADAAN & TIMING-NYA

Gunakan `DUR.state = 0.5s` dan `EASE.out = expo.out` sebagai default
ke mana-mana kecuali ditulis lain.

#### 3.1 `IntroCurtain.astro` → **page-load reveal**
- Layar penuh warna site (atau hitam) menutup viewport saat HTML masuk.
- **Keluar saat DOM siap, bukan saat `load` event** — `requestAnimationFrame`
  × 2 setelah `DOMContentLoaded`.
- Kurtain pakai **`clip-path: inset(0 0 0% 0)` → `inset(0 0 100% 0)`**
  (bukan `transform: translateY(-100%)`):(clip-path tidak memicu
  layout, dan tepinya tetap tajam di semua DPI).
  `transform: scaleY(0)` dengan `transform-origin: top` boleh sebagai
  fallback kalau `clip-path` tidak didukung.
- Stagger penutup kurtain 3–4 panel horizontal, delay 0.06s masing-masing.
- **Hero me-reveal di dalam kurtain yang masih menutup** — butuh
  `sequence: kurtain keluar 0 → hero split-line masuk`. Total under
  1.6s. Jangan dua-duanya start bareng.
- Aturan: **wajib bisa di-skip** — `sessionStorage` dengan key
  `motion:curtain:${location.pathname}`, atau guard `if (document.referrer)`
  supaya navigasi internal tidak memutar kurtain tiap kali.

#### 3.2 `Hero.astro` → **63 trigger kecil + canvas + marquee**
- **A. Canvas particle 2D (dari zamkara)**: `<canvas class="absolute inset-0 z-0">`
  di dalam hero, teks hero di `z-10`. Particle:
  - ~90–140 titik, radius 0.8–2.2px, warna site accent, `globalAlpha` 0.15–0.55
  - **Mouse repulsion/float**: jarak < 160px → di-push, lerp `0.08`
  - `requestAnimationFrame` **WAJIB berhenti** saat canvas keluar viewport
    (`IntersectionObserver`) atau saat `document.hidden`
  - Handle `devicePixelRatio` dan `resize` dengan `ResizeObserver`
  - **No-WebGL**: 2D context, harus jalan di device kelas bawah
  - Fallback kalau `prefers-reduced-motion`: render 1 frame statis
- **B. 63 trigger terpisah (dari heynesh)**: split `h1` jadi lines dengan
  mask, tiap line `y: '110%' → 0`, stagger 0.06, durasi 0.5,
  `ease: expo.out`. Lalu **9–12 trigger terpisah** untuk: eyebrow,
  sub-copy, CTA button, portofolio/portrait image (`clip-path` wipe
  `inset(0 100% 0 0)` → `inset(0 0 0 0)`, 0.9s), dan tiap stat pill.
  Semuanya `once: true`, **tanpa scrub**.
- **C. Ticker/marquee** (dari nesh `hero`): satu baris teks repeating
  (mis. "AVAILABLE FOR WORK — DESIGN ENGINEER — ") marching horizontal,
  `gsap.to({xPercent: -50}, {repeat:-1, ease:'none', duration: 14})`,
  dan **berhenti saat `document.hidden`**.
- **D. Scroll cue**: bounce vertikal loop `y: 0 → 6 → 0`, 1.6s, `yoyo`.

#### 3.3 `About.astro` → **stacked card deck (pola 69-trigger heynesh)**
Ini signature terbesar yang harus disalin persis.
- Section `position: relative`, tinggi section **~260–320vh**
  (supaya ada runway untuk progress).
- Di dalamnya `.deck` dengan **`position: sticky; top: 0; height: 100vh`**
  (CSS sticky, **jangan** `ScrollTrigger.pin`).
- 5–7 kartu konten (bio/arah/jaringan/ekspertise). Kartu aktif sedikit lebih
  besar seperti nesh (`w≈404px` vs tetangganya `≈394px` — perbedaan halus,
  bukan dramatis).
- Satu **`ScrollTrigger` dengan `scrub: 0.5`** (`trigger: section`,
  `start: 'top top'`, `end: 'bottom bottom'`) → **`snap`** antar index kartu
  (`ScrollTrigger.create({ snap: ... })` atau manual easing lerp ke index
  terdekat dengan `EASE.inOut`, 0.4s). **Inilah satu-satunya tempat
  scrub dipakai** — justru 163 trigger nesh pun tidak perlu, tapi sticky
  deck butuh feedback scroll agar user tahu masih bisa digerakkan.
- State tiap kartu **mengikuti progress**, bukan `onEnter`:
  `p = scrollProgress` (0..1), `i = p * (n-1)`, `d = i - idx`:
  ```
  |d| < 0.5 : kartu aktif   → scale 1,    opacity 1,    x 0
  |d| < 1.2 : tetangga       → scale 0.88, opacity 0.45, x ∓(24 + 24*sign(d))
  else      : IDLE           → scale 0.6,  opacity 0,    x ∓140*sign(d)
  ```
  Interpolasi **linear terhadap `d`** di dalam zona aktif supaya gerakannya
  **nyambung & scrub-able**, bukan step yang terputus-putus. Ini penting:
  kalau pakai `toggleActions` per-kartu, kartu akan **menghilang saat
  keluar viewport**, dan deck jadi terlihat jelek.
- Kartu: `border-radius 20px`, `overflow:hidden`, `box-shadow` lembut.
  Media di dalam = `BlurImage.astro` yang sudah ada — pakai,
  jangan bikin blur sendiri.
- Card **image** inner: parallax `yPercent: -8 → 8` di scrub yang sama.

#### 3.4 `Disciplines.astro` → **border-runner accordion (nilai 1 trigger, bukan 5)**
- **VARIASI dari referensi — dengan alasan**: 4–5 item, user cuma baca
  beberapa. Accordion/ruin ✓ cepat dibaca ✓ animasi masuk tetap meriah ✓
  **WAJIB pakai**: jarak antar-item **harus tetap** (`grid-auto-rows`
  tetap / `min-height` fix pada collapse state) supaya reflow tidak
  mendorong layout section lain saat item buka-tutup.
- Border 1px site-line mengelilingi tiap baris; `gap: 1px` dengan
  background site-line = **grid kontigu tanpa double-border**.
- Baris collapsed: `grid-template-rows: 0fr` → `1fr` (WAJIB pakai
  `0fr→1fr`, bukan `height: auto` —(height:auto tidak bisa di-transition
  dan jadi reflow tiap frame).
- Judul **rotates 3D** saat open: `rotateX: -90 → 0`,
  `transform-origin: bottom`, `perspective: 800px` di parent.
- Ikon `+` **rotate 45°** jadi `×` saat open (teknik zamkara).
- Baris yang **tidak** terbuka: `opacity .45`, hover `→ 1`.
- Switch antar-item di-*timeline*-kan: buka yang baru **setelah** yang lama
  menutup sebagian (`position: '<-0.25'`), durasi 0.5 `power3.inOut`.

#### 3.5 `ExperienceTimeline.astro` → **horizontal step rail (pola zamkara)**
- Section tinggi `~200vh`, track **`position: sticky; top: 0`**.
- Rail horizontal 4 step (`01–04`), **digerakkan progress vertikal scroll**:
  `ScrollTrigger scrub: 0.6`, `x: -(trackWidth - viewportWidth)` mapped
  linear ke progress.
- Step: nomor mono-font besar (`text-6xl`, `opacity .25`), judul bold,
  deskripsi pendek, thumbnail landscape `aspect-[16/10]`.
- Progress aktif step: nomor `opacity .25 → 1`, kartu `scale .92 → 1`,
  **dan** garis progress horizontal di bawah rail terisi
  `scaleX 0→1` sinkron dengan progress.
- WAJIB: **arrow keyboard** (`←`/`→`) untuk accessibility + dots yang
  `click`-able untuk lompat (GSAP `scrollTo` via `ScrollToPlugin`,
  durasi 1.0, `power3.inOut`) — user tidak boleh terjebak scroll panjang.
- Mobile (`< 768px`): **fallback ke vertikal, HILANGKAN horizontal
  scroll sama sekali**. Jangan_andakan scroll-jacking di layar kecil.

#### 3.6 `FeaturedProjects.astro` + `OtherProjects.astro` → **horizontal card wall**
- Featured: track horizontal sticky, scroll vertikal → `x` horizontal
  (pola 1, terverifikasi: `.work-sticky` + 7 `A.work-card`).
- **IDLE tiap card persis nesh**: `opacity: 0; transform: scale(0.6)
  translateY(52px)` → aktif `scale(0.9083)` → `scale(1)`. Naikkan
  stagger antar-card 0.05s. Hover: `y: -8`, image `scale(1.06`
  (WAJIB `overflow:hidden` di card), `box-shadow` naik, arrow
  `translate(4,-4)`.
- Progress bar `scaleX` di bawah track dengan `origin: left`.
- **Image placeholder shimmer**: pakai `BlurImage.astro` yang ada; jangan
  tambah loader kedua.
- `OtherProjects`: **grid 2 kolom (desktop) / 1 (mobile)**, statis-ish,
  stagger masuk `y: 24 → 0, opacity: 0 → 1` stagger 0.06,
  `once: true`, `start: 'top 85%'`. **Jangan pakai scroll-snap** —
  grid yang bisa di-snapped akan feltak enak di mobile danquite
  miércoles di desktop.

#### 3.7 `Contact.astro` → **form focus choreography**
- Section tinggi, ada panel besar yang **menyempit jadi strip** saat form
  masuk viewport: `scale: 1 → 0.92`, `borderRadius: 0 → 16`,
  `duration: 0.8`, `ease: power3.inOut`. Ini satu-satunya transform
  layout-ish di section ini.
- Field stagger `y: 16 → 0, opacity: 0 → 1`, stagger 0.05, `once: true`.
- **Label → floating label** (bukan `placeholder` sebagai label — itu
  accessibility buruk). WAJIB: `<label for>` + `aria-describedby`,
  dan `autocomplete` yang benar (`name`, `email`, `message`).
- Submit button: WAJIB punya `type`, `disabled` + `aria-busy` saat
  mengirim, dan **error di-`role="alert"` + `aria-live="polite"`**.
  Submit lewat `fetch` dengan optimistic UI, bukan form reload.
- Fokus keyboard: `:focus-visible` ring site-accent `2px offset 2px`,
  **jangan** `outline: none` tanpa pengganti.

#### 3.8 `FloatingNav.astro` → **hide-on-scroll-down (terukur di zamkara)**
- `position: fixed`, `z-50`.
- `translateY: 0 → -calc(100% - 4px)` saat scroll turun melewati 240px,
  kembali `0` saat scroll naik. `scrub` **tidak** dipakai — pakai
  `ScrollTrigger.create({ onUpdate: self => ... })` + `gsap.to`
  `duration: 0.3` `EASE.soft`, plus guard agar tidak berflip-flop
  (hysteresis 60px). Terukur: clamp di **-104px**.
- Site progress bar tipis (`height: 2px`, `scaleX`, `origin: left`,
  `z-index: 60`).
- Tombol **theme toggle WAJIB** lewat CSS `:root`/`data-theme`, dan state
  tersimpan (`localStorage`), **`aria-pressed` + label dinamis** —
  jangan andalkan `prefers-color-scheme` saja.
- **`skip to content` link** yang muncul saat Tab pertama ditekan
  (`focus-visible`).

#### 3.9 `TransitionSquare.astro` → **route transition**
- Navigasi antar-halaman: square/rect yang **tumbuh dari titik klik**:
  `clip-path: circle(0% at var(--cx) var(--cy))` → `circle(150% at …)`
  (`--cx/--cy` diisi dari `event.clientX/Y` saat klik, unit `px`).
  Circle overlay **tidak** memicu reflow dan GPU-friendly.
- Keluar 0.45s, halaman baru masuk setelah 0.35s, total < 1s.
- WAJIB **fallback tanpa-JS**: `ViewTransitions` (`document.startViewTransition`)
  sebagai progressive enhancement bila ada; kalau tidak, navigasi normal.

---

### 4. ATURAN LINTAS YANG WAJIB DIPATUHI

1. **WAJIB `prefers-reduced-motion: reduce`** — Lenis mati, GSAP
   `timeScale(100)`, semua state akhir instan, canvas & marquee & odometer
   **berhenti**. Ini accessibility requirement, bukan fitur tambahan.
2. **`once: true`** untuk semua reveal masuk viewport. Ini yang bikin situs
   terasa cepat dan tidak "nempel" — persis behavior nesh (0 scrub trigger).
3. **Hanya SATU tempat pakai `scrub`**: `About` sticky deck dan
   `ExperienceTimeline` horizontal rail. Kedua-duanya butuh feedback
   scroll. Tidak di tempat lain.
4. **Hanya `transform`, `opacity`, `clip-path`, `filter` yang dianimasikan.**
   Dilarang menganimasikan `width`/`height`/`top`/`left`/`margin`
   (kecuali `grid-template-rows: 0fr→1fr`, yang aman).
5. **`will-change` hanya saat animasi berjalan**; pasang di `from`/`to` via
   callback, lepas di `onComplete`. Jangan `will-change` permanen —
   boros GPU memory.
6. **Semua `ScrollTrigger` dibuat dalam scope** dan di-`kill()` saat
   `astro:before-swap` / `astro:page-load`. Tanpa ini, navigasi menumpuk
   trigger → memory leak + scroll lambat. Ini WAJIB di `engine.ts`.
7. **Mobile-first guard**: jangan pernahHV Animated scroll-jacking di
   `< 768px` atau saat `pointer: coarse`. Ganti dengan fade-in normal.
   `[INFERENCE]` Aman: user expectation mobile ≠ desktop.
8. **Zero layout shift**: semua gambar/canvas `width`/`height`/`aspect-ratio`
   eksplisit. Reserve space untuk state `opacity: 0`.
9. **Tidak boleh** `console.log` tersisa, `TODO`, stub, atau elemen yang
   "selalu ada tapi tidak berfungsi". Kalau sebuah efek tidak bisa
   diimplementasikan, **hapus claim-nya dari UI**, jangan pakai no-op.
10. **TypeScript strict**, tanpa `any`. `astro check` harus 0 error.

---

### 5. VERIFIKASI WAJIB (jangan klaim selesai tanpa bukti)

Jalankan `astro dev --background`, lalu buktikan dengan browser nyata:

1. `astro check` → 0 error.
2. **`astro build` sukses** — animasi berbasis `window` WAJIB di-guard
   (`if (typeof window !== 'undefined')` atau `astro:page-load`), kalau
   tidak build SSR akan crash.
3. **Scroll penuh tiap section** dengan screenshot pada beberapa posisi,
   dan cek `getComputedStyle` tiap elemen target **tidak pernah** stuck di
   state `opacity: 0` setelah lewat viewport.
4. **Kontrol Lenis**: saat Lenis aktif `window.scrollY` **harus berubah
   halus**; setelah `prefers-reduced-motion: reduce` diemulasikan,
   `window.Lenis` **harus lenong / tidak ada**.
5. **Navigasi antar-halaman 2×** dan pastikan **jumlah ScrollTrigger
   tidak bertambah** (`ScrollTrigger.getAll().length` stabil) — ini bukti
   anti-leak.
6. **Emulasikan viewport mobile** (`390×844`, `pointer: coarse`) dan
   pastikan tidak ada horizontal overflow (`document.documentElement
   .scrollWidth <= innerWidth`) dan tidak ada scroll-jacking.
7. Lighthouse / Web Vitals: LCP dan CLS **tidak boleh memburuk** dibanding
   sebelum. Kalau canvas hurt CLS, bungkus dengan `aspect-ratio`.

Kalau ada item di atas yang gagal, perbaiki sampai lulus. **Jangan melapor
"sudah selesai" tanpa output nyata dari langkah 1–7.**

---

### 6. URUTAN KERJA

1. Baca `src/components/*.astro` + `src/layouts/*.astro` yang ada.
   Inventory dulu — JANGAN bikin sistem kedua.
2. `bun add gsap lenis` + buat `src/lib/motion/{engine,presets,index}.ts`.
3. `IntroCurtain` → `Hero` → `About` → `Disciplines` →
   `ExperienceTimeline` → `FeaturedProjects` → `OtherProjects` →
   `Contact` → `FloatingNav` → `TransitionSquare`.
4. Reduced-motion guard di `engine.ts` **sejak commit pertama** — jangan
   ditambahkan belakangan.
5. Jalankan semua verifikasi di §5. Perbaiki. Ulangi sampai lulus.
6. Ringkas perubahan: file mana, efek apa, teknik dari referensi mana yang
   dipakai (tag `[nesh]` / `[dane]` / `[zamkara]`).

Mulai dengan membaca codebase yang ada, lalu laporkan inventory + rencana
singkat **sebelum** menulis kode.
