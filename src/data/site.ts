/**
 * ============================================================================
 * ZARVAISM — CENTRALIZED PORTFOLIO CONTENT
 * ============================================================================
 * Ubah isi website dengan mudah di 2 tempat saja:
 *
 * 1. Konten panjang berbasis Markdown (otomatis tervalidasi & masuk layout):
 *    - Selected Work / Case Studies : src/content/projects/*.md  (featured: true, order)
 *    - Work Experience              : src/content/experiences/*.md (order)
 *    - Blog / Writing               : src/content/blog/{en,id}/*.md
 *
 * 2. Konten ringkas & metadata terpusat (file ini — src/data/site.ts):
 *    - Identitas, kontak, sosial    : `site`, `social`, `nav`
 *    - Hero ticker & angka stats    : `heroTicker`, `heroStats`
 *    - About & layanan              : `aboutContent`, `disciplines`
 *    - Langkah kerja                : `howIWorkSteps`
 *    - Proyek lainnya (tabel arsip) : `archive`
 *    - FAQ (EN & ID)                : `faqItems`
 *    - Data tambahan halaman CV     : `cvData`
 * ============================================================================
 */

export const site = {
  brand: 'ZARVAISM',
  name: 'Bintang Fadilah Ramadhan',
  role: 'Mobile & Frontend Developer',
  location: 'Purwokerto, Indonesia',
  shortLocation: 'Purwokerto, ID',
  email: 'bintangfara363@gmail.com',
  availability: {
    en: 'AVAILABLE FOR WORK',
    id: 'TERSEDIA UNTUK PROYEK',
  },
  headline: 'Crafting mobile and web apps that feel effortless to use.',
  description:
    'Mobile and Frontend Developer working with Flutter, React and TypeScript. Builds production apps with Clean Architecture, BLoC state management and clean REST API integration.',
} as const;

export const social = [
  { label: 'Instagram', handle: 'zarva.ai', href: 'https://instagram.com/zarva.ai' },
  { label: 'Dribbble', handle: 'BintangFadilah', href: 'https://dribbble.com/BintangFadilah' },
  {
    label: 'LinkedIn',
    handle: 'bintang-fadilah-ramadhan',
    href: 'https://linkedin.com/in/bintang-fadilah-ramadhan-078647206',
  },
  { label: 'GitHub', handle: 'zarva-pathcode', href: 'https://github.com/zarva-pathcode' },
] as const;

export const nav = [
  { label: 'Home', labelId: 'Beranda', href: '#hero' },
  { label: 'About', labelId: 'Tentang', href: '#about' },
  { label: 'Experience', labelId: 'Pengalaman', href: '#experience' },
  { label: 'Project', labelId: 'Karya', href: '#projects' },
  { label: 'CV', labelId: 'CV', href: '/cv' },
] as const;

export const heroTicker = [
  'Available for work',
  'Flutter',
  'React',
  'TypeScript',
  'Clean Architecture',
  'UI/UX',
] as const;

/** Displayed as Zamkara vertical odometer reels in the Hero. */
export const heroStats = [
  { value: '5+', label: { en: 'Years craft', id: 'Tahun berkarya' } },
  { value: '8', label: { en: 'Projects shipped', id: 'Proyek dirilis' } },
] as const;

export const aboutContent = {
  en: {
    statement: 'I design for the small screen first, then let the system scale up.',
    body: 'Five years of Flutter and React work, with a design background before it. I write the architecture as carefully as the interface — Clean Architecture, BLoC, and REST integration that survives the second developer.',
    meta: [
      ['Based in', 'Purwokerto, ID'],
      ['Experience', '5 years'],
      ['Focus', 'Mobile & Frontend'],
    ] as ReadonlyArray<readonly [string, string]>,
  },
  id: {
    statement: 'Saya merancang untuk layar kecil dulu, lalu membiarkan sistemnya membesar.',
    body: 'Lima tahun kerja Flutter dan React, dengan latar desain sebelum itu. Saya menulis arsitektur sekeras menulis antarmuka — Clean Architecture, BLoC, dan integrasi REST yang tetap masuk akal untuk developer berikutnya.',
    meta: [
      ['Domisili', 'Purwokerto, ID'],
      ['Pengalaman', '5 tahun'],
      ['Fokus', 'Mobile & Frontend'],
    ] as ReadonlyArray<readonly [string, string]>,
  },
} as const;

export const disciplines = [
  {
    index: '01',
    slug: 'Mobile',
    title: 'Flutter Development',
    body: 'Developing cross-platform mobile applications for Android. I use Flutter to build smooth, native-like experiences on clean, scalable structure.',
    bodyId:
      'Mengembangkan aplikasi mobile lintas platform untuk Android dengan Flutter — halus, responsif, dan berdiri di atas struktur arsitektur yang rapi.',
    tags: ['Flutter', 'Dart', 'BLoC'],
  },
  {
    index: '02',
    slug: 'Systems',
    title: 'UI/UX Design',
    body: 'Translating concepts into visually engaging, user-centric interfaces. I build high-fidelity prototypes and design systems in Figma that are ready for development handover.',
    bodyId:
      'Menerjemahkan konsep menjadi antarmuka yang jelas dan berpusat pada pengguna, lengkap dengan prototipe presisi dan design system siap serah terima.',
    tags: ['Figma', 'Design Systems', 'Prototyping'],
  },
  {
    index: '03',
    slug: 'Engineering',
    title: 'Web Development',
    body: 'Building responsive, accessible web applications with React, Laravel and Tailwind — interfaces that look sharp and run smoothly.',
    bodyId:
      'Membangun aplikasi web responsif dan aksesibel dengan React, Laravel, dan Tailwind — tajam secara visual dan ringan saat dijalankan.',
    tags: ['React', 'Laravel', 'Tailwind'],
  },
] as const;

export const howIWorkSteps = [
  {
    n: '01',
    title: { en: 'Discover', id: 'Pahami' },
    body: {
      en: 'Brief, constraints, references. I interview you before I open the editor.',
      id: 'Brief, batasan, referensi. Saya mewawancarai kamu sebelum membuka editor.',
    },
    out: 'Brief + scope',
  },
  {
    n: '02',
    title: { en: 'Architect', id: 'Rancang' },
    body: {
      en: 'Design tokens, data model, component map. Decisions are written down before they are coded.',
      id: 'Token, model data, peta komponen. Keputusan ditulis sebelum dikodekan.',
    },
    out: 'Tokens + schema',
  },
  {
    n: '03',
    title: { en: 'Build', id: 'Bangun' },
    body: {
      en: 'Flutter or React, clean architecture, motion inside the component — not a layer on top.',
      id: 'Flutter atau React, arsitektur bersih, motion di dalam komponen — bukan lapisan tambahan.',
    },
    out: 'Weekly builds',
  },
  {
    n: '04',
    title: { en: 'Ship', id: 'Kirim' },
    body: {
      en: 'QA, performance budget, handover docs. The next developer should not need to ask me anything.',
      id: 'QA, anggaran performa, dokumentasi serah terima. Developer berikutnya tidak perlu bertanya.',
    },
    out: 'Handover',
  },
] as const;

export const keyNumbers = [
  { value: '5+', label: 'Years craft' },
  { value: '8', label: 'Projects shipped' },
  { value: '1', label: 'Play Store app' },
] as const;

/**
 * Secondary projects, shown as the archive table on the homepage.
 * Count and year range in OtherProjectsSection are computed automatically.
 */
export const archive = [
  {
    year: '2025',
    project: 'Bolasoft Arena',
    category: 'React SPA Revamp',
    stack: 'React, TypeScript, REST',
    artifact: 'Client platform',
  },
  {
    year: '2025',
    project: 'EduApp',
    category: 'Fullstack Web',
    stack: 'Laravel, Tailwind, ResponsiveVoice',
    artifact: 'Full app',
  },
  {
    year: '2024',
    project: 'Weebase',
    category: 'Mobile · Play Store',
    stack: 'Flutter, REST API',
    artifact: 'Live on Play Store',
  },
  {
    year: '2024',
    project: 'SampahIn',
    category: 'Mobile & UI/UX',
    stack: 'Flutter, OpenStreetMap',
    artifact: '3-role ecosystem',
  },
  {
    year: '2024',
    project: 'ReBio',
    category: 'Mobile · HKI Registered',
    stack: 'Flutter, Bank Sampah',
    artifact: 'HKI certified',
  },
] as const;

export const faqItems = {
  en: [
    [
      'Are you available for new work?',
      'I am full-time at Rekatama, so freelance runs in the evenings and on weekends. Small scopes, audits and design-to-code work fit best.',
    ],
    [
      'Do you work remotely?',
      'Yes — Purwokerto, Indonesia (GMT+7). Async by default, with overlap into European afternoons.',
    ],
    [
      'What is your stack?',
      'Flutter and Dart for mobile; React, TypeScript and Tailwind on web; Laravel when the backend is mine.',
    ],
    ['Can you join an existing codebase?', 'Yes. I start by reading, not rewriting.'],
    [
      'How do you price work?',
      'Fixed scope per milestone, or a day rate for open-ended collaboration.',
    ],
    [
      'What happens after launch?',
      'Handover docs, a walkthrough recording, and 30 days of fixes.',
    ],
  ] as ReadonlyArray<readonly [string, string]>,
  id: [
    [
      'Apakah kamu menerima proyek baru?',
      'Saat ini full-time di Rekatama, jadi freelance berjalan malam dan akhir pekan. Lingkup kecil dan audit paling cocok.',
    ],
    [
      'Apakah bisa remote?',
      'Bisa — Purwokerto, Indonesia (GMT+7). Asinkron secara default, overlap dengan Eropa sore hari.',
    ],
    [
      'Stack apa yang dipakai?',
      'Flutter dan Dart untuk mobile; React, TypeScript, Tailwind di web; Laravel jika backend saya yang pegang.',
    ],
    ['Bisa masuk ke codebase yang sudah ada?', 'Bisa. Saya mulai dengan membaca, bukan menulis ulang.'],
    [
      'Bagaimana cara menentukan harga?',
      'Skala tetap per milestone, atau day rate untuk kolaborasi terbuka.',
    ],
    [
      'Setelah rilis, bagaimana?',
      'Dokumentasi serah terima, rekaman walkthrough, dan 30 hari perbaikan.',
    ],
  ] as ReadonlyArray<readonly [string, string]>,
} as const;

export const cvData = {
  year: '2026',
  pdfHref: '/cv/bintang-fadilah-cv.pdf',
  education: [
    {
      school: 'Universitas Amikom Purwokerto',
      degree: { en: 'Information Systems', id: 'Sistem Informasi' },
      period: '2023 — present',
    },
    {
      school: 'SMK Negeri 1 Purwokerto',
      degree: { en: 'Software Engineering', id: 'Rekayasa Perangkat Lunak' },
      period: '2021',
    },
  ],
  certifications: [
    {
      title: 'HKI — ReBio (bank sampah application)',
      issuer: 'Ditjen Kekayaan Intelektual, Kumham RI',
      period: '2024',
    },
    {
      title: 'Dicoding — Flutter Developer Expert',
      issuer: 'Clean architecture · TDD · BLoC · CI/CD',
      period: '2022',
    },
  ],
  organisation: [
    {
      role: {
        en: 'Mobile Secretary · Programming — UKM Intermedia',
        id: 'Sekretaris Mobile · Divisi Programming — UKM Intermedia',
      },
      period: '2023 — 2025',
    },
    {
      role: {
        en: 'Competition Coordinator — Intermedia IT Competition',
        id: 'Koordinator Kompetisi — Intermedia IT Competition',
      },
      period: '2024 — 2025',
    },
  ],
  skillGroups: [
    { label: 'Mobile', items: 'Flutter · Dart · BLoC · Clean Architecture' },
    { label: 'Web', items: 'React · TypeScript · Tailwind · Laravel · PHP' },
    { label: 'Design', items: 'Figma · Design Systems · Prototyping' },
    { label: 'Tooling', items: 'Git · REST · Postman · Play Console' },
  ],
} as const;
