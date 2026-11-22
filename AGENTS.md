# AGENTS.md — Zarvaism Portfolio & Studio CMS

Astro 7 SSR (`@astrojs/vercel`) + TypeScript + Tailwind CSS v4 editorial portfolio & CMS platform untuk **Bintang Fajar Putra (`Zarvaism`)**. Satu aplikasi, dua mode: **situs publik dwibahasa** (Inggris `/` dan Indonesia `/id`) dan **Studio CMS** (`/admin` + *Quick Edit Overlay* untuk admin terautentikasi) yang didukung **LibSQL / SQLite (Turso)** serta **Vercel Blob**.

> **Prinsip utama:** halaman publik untuk pengunjung anonim **wajib bersih dari markup CMS/admin** dan mempertahankan identitas visual *Editorial Tactile* (*Paper & Night*), *Hero live halftone spotlight*, animasi editorial, dan aksesibilitas *reduced-motion* 100%.

---

## Developer Commands

| Tugas | Perintah | Catatan |
|---|---|---|
| Install dependencies | `npm install` | Pastikan `package-lock.json` tetap sinkron |
| Dev server (background) | `astro dev --background` | Kelola via `astro dev stop`, `astro dev status`, `astro dev logs` |
| Dev server (port verifikasi) | `npx astro dev --port 4322 --force` | Gunakan `astro dev` (bukan `astro preview`) untuk menguji SSR & `/api/*` |
| Typecheck (Astro + TS) | `npm run check` | Menjalankan `astro check` |
| Build produksi | `npm run build` | Menjalankan `astro check && astro build` (output `@astrojs/vercel`) |
| Push schema DB (Drizzle) | `npm run db:push` | Push `src/db/schema.ts` ke database target |
| Seed konten awal CMS | `npm run db:seed` | Menjalankan `node scripts/seed-cms.mjs` (`--overwrite` opsional) |
| Generate hash password admin | `npm run cms:hash -- "password"` | Menghasilkan `ADMIN_PASSWORD_HASH=scrypt:salt:hash` & `CMS_SESSION_SECRET` |
| Generate CV PDF | `npm run cv:pdf` | Generate PDF CV via `scripts/cv-pdf.mjs` |
| Verifikasi CMS + SSR E2E | `node scripts/verifycms.mjs` | Jalankan terhadap SSR dev server di `http://localhost:4322` |
| Verifikasi Hero Halftone & Motion | `node scripts/verifyherolens.mjs` | Jalankan terhadap `http://localhost:4322` |
| Cek motion / nav / VT / i18n lain | `npm run verify:motion`, `verify:nav`, `verify:vt`, `verify:interactions`, `verify:portrait`, `verify:locale` | Script verifikasi Playwright di `scripts/` |

> **Catatan Windows PowerShell 5.1:** hindari operator `&&` di command line langsung; gunakan `; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE };` bila merangkai perintah.

---

## Developer Observability & Debugging

1. **Chrome DevTools (`F12` / `Ctrl+Shift+I`)**:
   - Tab **`Console`**: wajib bebas dari error runtime, uncaught exception, maupun error sanitasi/hidrasi. Seluruh script verifikasi Playwright (`verifycms.mjs`, `verifyherolens.mjs`) akan gagal jika muncul `console.error` atau `pageerror`.
   - Tab **`Network` (`Fetch/XHR`)**: gunakan untuk memeriksa status HTTP (`200`, `201`, `400`, `401`, `422`), payload JSON ke `/api/admin/*`, dan header cookie `zarva_session`.
2. **SSR Server Logs**: jalankan `astro dev logs` (saat memakai background mode) untuk melihat status `[200]/[302]/[401]/[500]` endpoint API dan error LibSQL/Zod sisi server.
3. **Aksesibilitas Form & Navigasi**: setiap `<input>`, `<textarea>`, dan `<select>` di `/admin` maupun drawer Quick Edit wajib memiliki pairing `<label for>` + `id`/`name` yang valid serta `aria-current`/`aria-label` yang jelas.

---

## Database, Media Storage & Environment Caveats

- **Database adalah SQLite / LibSQL (BUKAN MySQL)**:
  - Menggunakan `drizzle-orm` + `@libsql/client` (`src/db/schema.ts`, `src/db/client.ts`).
  - **Produksi (Vercel)**: terhubung ke **Turso** melalui `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN`.
  - **Lokal / Dev**: otomatis *fallback* ke file SQLite lokal **`.data/zarvaism.db`** bila env Turso kosong.
  - **Auto-schema & Safe Fallback**: `ensureSchema()` otomatis membuat seluruh tabel (`site_sections`, `experiences`, `projects`, `posts`, `media_assets`) pada request pertama; `src/lib/cms/repository.ts` memvalidasi record dengan `zod` dan jatuh aman ke `src/lib/cms/defaults.ts` bila tabel masih kosong.
- **Media Upload (`src/lib/cms/media.ts`)**:
  - **Produksi**: menggunakan **Vercel Blob** saat `BLOB_READ_WRITE_TOKEN` diset.
  - **Lokal / Dev**: menyimpan berkas upload ke **`.data/uploads/`** dan menyajikannya melalui `GET /api/media/[file]`.
- **Aturan Kritis `.env` & Password Hash (`$ vs :`)**:
  - Vite menggunakan `dotenv-expand` saat memuat `.env`. String yang mengandung `$salt$hash` tanpa quote akan diinterpolasi sebagai variabel kosong dan menyebabkan login `POST /api/admin/login` mengembalikan `401` secara diam-diam.
  - **Wajib gunakan format titik dua `scrypt:salt:hash`** (dihasilkan otomatis oleh `npm run cms:hash`). `verifyPassword()` di `src/lib/cms/auth.ts` tetap mendukung `scrypt:salt:hash` maupun legacy `scrypt$salt$hash`.
- **Environment Variables Vercel (lihat `.env.example`)**:
  - `TURSO_DATABASE_URL`
  - `TURSO_AUTH_TOKEN`
  - `BLOB_READ_WRITE_TOKEN`
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD_HASH`
  - `CMS_SESSION_SECRET` (minimal 16 karakter; disarankan 64 hex)

---

## Git & Version Control Restrictions (CRITICAL)

- **File terlarang di Git**: jangan pernah men-stage atau meng-commit `.env`, `.data/`, `public/uploads/`, `dist/`, `.vercel/`, atau secret kredensial dalam bentuk apa pun (sudah masuk `.gitignore`).
- **Jangan Auto-Commit / Auto-Push**: jangan membuat commit atau push ke remote kecuali diminta secara eksplisit oleh pengguna.
- **Inspeksi Pra-Commit**: sebelum commit, selalu jalankan `git status` dan `git diff` untuk memastikan tidak ada perubahan tak terduga atau file sensitif.
- **Operasi Destruktif Dilarang**: jangan pernah menjalankan `git push --force`, `git reset --hard`, `rm -rf`, atau menghapus cabang tanpa persetujuan eksplisit.

---

## Tech Stack (Faktual)

| Layer | Pilihan | Catatan Penting |
|---|---|---|
| Framework | **Astro 7.3.5** (`output: 'server'`) | Adapter `@astrojs/vercel` (`astro.config.mjs`) |
| Bahasa | **TypeScript 6** (`astro/tsconfigs/strict`) | `tsconfig.json` ketat; hindari `any` dan cast tidak perlu |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) | Ditambah `@tailwindcss/typography` di `src/styles/global.css` (**bukan Tailwind v3**) |
| Tipografi | `@fontsource-variable/inter`, `@fontsource/instrument-serif`, `@fontsource-variable/doto`, `@fontsource-variable/geist-mono` | Disajikan lokal via bundle font |
| Motion & Visual | `gsap` `^3.15`, `lenis` `^1.3`, Canvas 2D native | *Hero live halftone spotlight*, *footer halftone fire*, *tactile cursor*, *View Transitions* |
| Database & ORM | `@libsql/client` + `drizzle-orm` (`drizzle-kit`) | SQLite lokal (`.data/zarvaism.db`) ↔ Turso LibSQL |
| Media Storage | `@vercel/blob` | Vercel Blob di prod; `.data/uploads/` di dev |
| Markdown & Keamanan | `marked` + `sanitize-html` + `zod` v4 | Seluruh body blog di-parse & disanitasi di `src/lib/cms/markdown.ts` |
| Verifikasi | **Playwright** (`playwright` + Chrome/Edge lokal) | Suite verifikasi end-to-end di `scripts/` |

---

## Arsitektur & Struktur Direktori

```text
src/
├── env.d.ts                    # Deklarasi App.Locals (isAdmin, adminEmail) & env types
├── middleware.ts               # Verifikasi cookie zarva_session, guard /admin & /api/admin/*
├── content.config.ts           # Skema Astro Content Collections (referensi/legacy)
├── assets/                     # Portrait halftone light/dark, bg-image, asset project
├── styles/global.css           # Tailwind v4 entry, tema Paper & Night, utilitas & prose
├── db/
│   ├── schema.ts               # Tabel site_sections, experiences, projects, posts, media_assets
│   └── client.ts               # resolveDbUrl(), getLibsqlClient(), getDb(), ensureSchema()
├── data/
│   ├── site.ts                 # Copy & struktur default portofolio (EN & ID)
│   └── placeholders.ts         # Data fallback placeholder
├── i18n/index.ts               # Helper lokal 'en' | 'id' & kamus UI terjemahan
├── lib/
│   ├── cms/
│   │   ├── auth.ts             # scrypt hashing, HMAC session token, cookie, isSameOrigin
│   │   ├── validators.ts       # Skema Zod v4 untuk 7 section, experience, project, post
│   │   ├── defaults.ts         # Nilai bawaan section dari src/data/site.ts & i18n
│   │   ├── repository.ts       # Query, mutasi, & fallback aman CMS (section, collection, blog, media)
│   │   ├── seed.ts             # Seed idempotent dari konten/default bawaan
│   │   ├── markdown.ts         # renderMarkdownSafe() via marked + sanitize-html
│   │   ├── media.ts            # Upload, serve, delete (Vercel Blob / lokal .data/uploads)
│   │   ├── http.ts             # Wrapper JSON response & error handler Zod/API
│   │   ├── adminDom.ts         # Builder field form, repeater, upload widget, & toast
│   │   ├── adminClient.ts      # Client controller dashboard /admin (Overview, Sections, CRUD, Blog)
│   │   └── quickEdit.ts        # Controller kapsul Quick Edit & slide-over drawer di halaman publik
│   └── motion/                 # GSAP, Lenis, heroLens, footerAmbient, cursor/tactile, rail, dll.
├── layouts/
│   ├── Base.astro              # Shell HTML, font, theme script, View Transitions, QuickEditOverlay
│   └── Page.astro              # Shell halaman publik (SiteRail, NavMenu, Footer)
├── components/
│   ├── Hero.astro, SiteRail.astro, NavMenu.astro, ShellFooter.astro, Footer.astro, Ticker.astro
│   ├── sections/               # AboutSection, ExperienceSection, HowIWork, WorkSection, OtherProjectsSection, FaqSection
│   └── admin/QuickEditOverlay.astro
├── views/                      # Home.astro, Cv.astro, ProjectDetail.astro, BlogIndex.astro, BlogPost.astro, NotFound.astro
└── pages/
    ├── index.astro, about/, cv.astro, blog/, projects/, rss.xml.ts, 404.astro
    ├── id/                     # Halaman paralel bahasa Indonesia (/id, /id/cv, /id/blog, /id/projects)
    ├── admin/                  # index.astro (Studio CMS), login.astro
    └── api/
        ├── media/[file].ts     # Serve file upload lokal
        └── admin/              # login, logout, seed, preview-markdown, sections/[key], experiences/*, projects/*, posts/*, media/*
```

---

## Routing, Auth & Kontrak CMS

### Peta Route
- **Publik EN**: `/`, `/about`, `/cv`, `/projects/[...slug]`, `/blog`, `/blog/[...slug]`, `/rss.xml`
- **Publik ID**: `/id`, `/id/about`, `/id/cv`, `/id/projects/[...slug]`, `/id/blog`, `/id/blog/[...slug]`
- **Publik Asset API**: `GET /api/media/[file]`
- **Admin UI**: `/admin/login` (terbuka), `/admin` (dilindungi middleware → redirect `302` ke `/admin/login`)
- **Admin API (`/api/admin/*`)**:
  - `POST /api/admin/login`, `POST /api/admin/logout`
  - `POST /api/admin/seed` (query `?overwrite=1` untuk menimpa dengan default)
  - `POST /api/admin/preview-markdown`
  - `GET | PUT | DELETE /api/admin/sections/[key]` (`key`: `hero | about | how | other_projects | faq | cv | settings`)
  - `GET | POST /api/admin/experiences`, `PUT | DELETE /api/admin/experiences/[id]`, `POST /api/admin/experiences/reorder`
  - `GET | POST /api/admin/projects`, `PUT | DELETE /api/admin/projects/[id]`
  - `GET | POST /api/admin/posts`, `PUT | DELETE /api/admin/posts/[id]`
  - `GET | POST /api/admin/media`, `DELETE /api/admin/media/[id]`

### Aturan Auth & Keamanan (MANDATORY)
- Middleware (`src/middleware.ts`) memverifikasi cookie `zarva_session` dan mengisi `Astro.locals.isAdmin` + `Astro.locals.adminEmail`.
- Semua endpoint `/api/admin/*` (kecuali `/api/admin/login`) **wajib terautentikasi (`401`)**, dan mutasi (`POST/PUT/DELETE`) dilindungi pengecekan `isSameOrigin`.
- **Isolasi Pengunjung Publik**: `QuickEditOverlay.astro` dan script `quickEdit.ts` hanya dirender saat `Astro.locals.isAdmin === true`. Pengunjung anonim tidak boleh menerima elemen `#cms-quick-edit` sama sekali.
- **Draft Isolation**: artikel blog dengan `published = false` hanya boleh tampil di `/admin`, tidak boleh muncul di `/blog`, `/id/blog`, `/blog/[slug]`, atau `/rss.xml`.

---

## Aturan Desain, Motion & Studio UI (MANDATORY)

1. **Token Tema Paper & Night (`src/styles/global.css`)**:
   - Gunakan token CSS (`var(--canvas)`, `var(--surface)`, `var(--hover)`, `var(--ink)`, `var(--subtle)`, `var(--brand)`, `var(--brand-ink)`, `var(--signal)`, `var(--hairline)`) atau kelas semantik Tailwind (`bg-canvas`, `text-ink`, `text-brand`, `text-subtle`, `border-[color:var(--hairline)]`). Jangan meng-hardcode warna tema secara langsung agar mode *Paper* & *Night* tetap serasi.
2. **Integritas Motion & Hero Halftone**:
   - Jangan merusak siklus `astro:page-load` / `astro:before-swap` pada `src/lib/motion/*`.
   - Jaga struktur markup target seperti `[data-hero-canvas]`, `[data-hero-eyebrow]`, `.word-inner.text-brand`, dan dukungan `prefers-reduced-motion: reduce`.
3. **Konvensi Sidebar & Layout `/admin`**:
   - Jaga atribut `data-cms-tab="<id>"` dan `data-cms-count="<id>"` di `src/pages/admin/index.astro` agar navigasi, counter real-time, dan Playwright selector tetap berfungsi.
   - Jangan menimpa `btn.className` dengan utilitas desktop (`w-full`) di `setActiveNav()`; gunakan atribut `data-active="true|false"` dan `aria-current` sehingga strip tab horizontal di mobile tetap utuh.
   - Grid child yang membungkus overflow horizontal di `/admin` wajib memiliki `min-w-0` agar viewport mobile tidak melebar.

---

## Chaos Engineering & Resilience (Chaos Gatekeeper)

Jangan pernah hanya menguji *happy path*. Setiap perubahan pada SSR, CMS, Auth, Media, maupun Motion **wajib memikirkan dan menguji skenario kegagalan (*fault injection*)** agar sistem melakukan *graceful degradation* — **dilarang menghasilkan blank screen (`500` putih), UI macet, atau kebocoran akses**:

1. **Database / Turso / JSON Rusak atau Kosong**:
   - Halaman publik (`/`, `/id`, `/cv`, `/projects/*`, `/blog/*`) wajib tetap merender halaman utuh dengan fallback dari `src/lib/cms/defaults.ts` saat tabel DB belum di-seed atau JSON gagal lolos skema `zod`.
   - Kegagalan baca `media_assets` atau Blob Storage di `/admin` tidak boleh memblokir rendering dashboard utama (`.catch(() => [])`).
2. **Kegagalan Jaringan, Auth & Validasi API (`400` / `401` / `403` / `422` / `500` / Offline)**:
   - Submit form (`/admin/login`, `/admin`, dan *Quick Edit Drawer*) wajib membuka kembali state tombol (`finally` / `catch`) serta menampilkan feedback error yang jelas saat HTTP error atau koneksi terputus.
   - Simulasikan akses tanpa sesi (`/admin` → `302 /admin/login`, `/api/admin/*` → `401`), mutasi lintas-origin (`isSameOrigin` → `403`), dan kredensial salah (`401` + pesan error).
3. **Sanitasi Input, XSS & Isolasi Data**:
   - Uji payload Markdown berbahaya (`<script>`, `onerror=`, tautan `javascript:`) melalui `renderMarkdownSafe()` (`marked` + `sanitize-html`) agar tersanitasi penuh di `.prose` maupun preview.
   - Uji isolasi **Draft vs Published** (`/blog`, `/id/blog`, `/rss.xml`) dan pastikan DOM publik untuk pengunjung anonim tidak pernah memuat markup `#cms-quick-edit`.
4. **Motion, Canvas & Viewport Ekstrem**:
   - Uji *early scroll* saat animasi intro belum selesai, perpindahan cepat via *View Transitions* (`astro:before-swap` → cleanup RAF/listener), mode `prefers-reduced-motion: reduce`, dan perubahan viewport `390px` ↔ `1440px` tanpa `horizontal overflow` (`scrollWidth <= innerWidth`) serta **nol `console.error` / `pageerror`**.

---

## Official Astro Documentation

Rujuk dokumentasi resmi Astro saat mengerjakan rute, komponen, konten, styling, atau i18n:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

---

## Definition of Done (DoD)

Sebelum menyatakan pekerjaan selesai:

1. **`npm run build` (`astro check && astro build`)** lulus dengan exit code `0` (`0 errors, 0 warnings`).
2. **Verifikasi SSR & Playwright** (`node scripts/verifycms.mjs` dan `node scripts/verifyherolens.mjs` saat menyentuh CMS, SSR, routing, atau Hero/motion) lulus dengan **nol `console.error` dan nol `pageerror`**.
3. **Inspeksi Visual**: untuk perubahan UI/layout/animasi, periksa screenshot desktop & mobile secara visual dan pastikan tidak ada horizontal overflow (`scrollWidth <= innerWidth`).
4. **Chaos Gatekeeper**: jalur kegagalan (DB kosong/error, API `401`/`4xx`/`5xx`, Markdown XSS, isolasi draft & anonim, early scroll / reduced-motion) teruji aman — **nol blank screen** dan nol unhandled exception.
5. **Kebersihan Keamanan**: tidak ada secret di log/repo, markup Quick Edit terisolasi hanya untuk admin, dan Markdown ter-sanitasi.
6. **Sinkronisasi `AGENTS.md`**: perbarui `AGENTS.md` bila ada perubahan perintah CLI, skema DB, env var, route, atau konvensi arsitektur baru.
7. **Commit & Push**: selalu minta konfirmasi pengguna terlebih dahulu sebelum `git commit` atau `git push`.
