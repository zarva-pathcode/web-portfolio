/**
 * ============================================================================
 * ZARVAISM - CENTRALIZED PORTFOLIO CONTENT
 * ============================================================================
 * Ubah isi website dengan mudah di 2 tempat saja:
 *
 * 1. Konten panjang berbasis Markdown (otomatis tervalidasi & masuk layout):
 *    - Selected Work / Case Studies : src/content/projects/*.md  (featured: true, order)
 *    - Work Experience              : src/content/experiences/*.md (order)
 *    - Blog / Writing               : src/content/blog/{en,id}/*.md
 *
 * 2. Konten ringkas & metadata terpusat (file ini, src/data/site.ts):
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
  brand: "ZARVAISM",
  name: "Bintang Fadilah Ramadhan",
  role: "Mobile & Frontend Developer",
  location: "Purwokerto, Indonesia",
  shortLocation: "Purwokerto, ID",
  email: "bintangfara363@gmail.com",
  availability: {
    en: "OPEN FOR FREELANCE",
    id: "TERBUKA UNTUK FREELANCE",
  },
  headline: "I build mobile and web apps built to last.",
  description:
    "Mobile and Frontend Developer working with Flutter, React, and TypeScript. Building production apps with Clean Architecture, BLoC state management, and REST APIs.",
} as const;

export const social = [
  {
    label: "Instagram",
    handle: "zarva.ui",
    href: "https://instagram.com/zarva.ui",
  },
  {
    label: "Dribbble",
    handle: "BintangFadilah",
    href: "https://dribbble.com/bintangfadilah",
  },
  {
    label: "LinkedIn",
    handle: "bintang-fadilah-ramadhan",
    href: "https://linkedin.com/in/bintang-fadilah-ramadhan-078647206",
  },
  {
    label: "GitHub",
    handle: "zarva-pathcode",
    href: "https://github.com/zarva-pathcode",
  },
] as const;

export const nav = [
  { label: "Home", labelId: "Beranda", href: "#hero" },
  { label: "About", labelId: "Tentang", href: "#about" },
  { label: "Experience", labelId: "Pengalaman", href: "#experience" },
  { label: "Project", labelId: "Karya", href: "#projects" },
  { label: "CV", labelId: "CV", href: "/cv" },
] as const;

export const heroTicker = [
  "Open for freelance",
  "Flutter",
  "React",
  "TypeScript",
  "Clean Architecture",
  "UI/UX",
] as const;

/** Displayed as Zamkara vertical odometer reels in the Hero. */
export const heroStats = [
  { value: "5+", label: { en: "Years building", id: "Tahun berkarya" } },
  { value: "8", label: { en: "Shipped projects", id: "Proyek dirilis" } },
] as const;

export const aboutContent = {
  en: {
    statement:
      "I start from the mobile screen, then build the system around it.",
    body: "I have spent five years building Flutter and React apps, coming from a UI/UX design background. My day-to-day focus is predictable BLoC state, clear REST API layers, and codebases other developers can read without guesswork.",
    meta: [
      ["Based in", "Purwokerto, ID"],
      ["Experience", "5 years"],
      ["Focus", "Mobile & Frontend"],
    ] as ReadonlyArray<readonly [string, string]>,
  },
  id: {
    statement:
      "Saya mulai dari layar mobile, lalu menyusun sistem di sekitarnya.",
    body: "Sudah lima tahun saya membangun aplikasi Flutter dan React, berawal dari latar desain UI/UX. Fokus harian saya ada pada state management BLoC yang jelas, integrasi REST API yang rapi, dan struktur kode yang mudah dilanjutkan developer lain.",
    meta: [
      ["Domisili", "Purwokerto, ID"],
      ["Pengalaman", "5 tahun"],
      ["Fokus", "Mobile & Frontend"],
    ] as ReadonlyArray<readonly [string, string]>,
  },
} as const;

export const disciplines = [
  {
    index: "01",
    slug: "Mobile",
    title: "Flutter Development",
    body: "Cross-platform Android apps built with Flutter, Dart, and BLoC. Structured for clear state flow and steady performance on mid-range devices.",
    bodyId:
      "Aplikasi Android dengan Flutter, Dart, dan BLoC. Disusun dengan alur state yang jelas agar tetap ringan di perangkat kelas menengah.",
    tags: ["Flutter", "Dart", "BLoC"],
  },
  {
    index: "02",
    slug: "Systems",
    title: "UI/UX Design",
    body: "Interface layouts, component libraries, and clickable prototypes in Figma, structured so developers can implement them directly.",
    bodyId:
      "Tata letak antarmuka, pustaka komponen, dan prototipe interaktif di Figma yang siap langsung diimplementasikan ke kode.",
    tags: ["Figma", "Design Systems", "Prototyping"],
  },
  {
    index: "03",
    slug: "Engineering",
    title: "Web Development",
    body: "Responsive web applications built with React, TypeScript, Tailwind, and Laravel. Focused on clear hierarchy, fast load times, and maintainable code.",
    bodyId:
      "Aplikasi web responsif dengan React, TypeScript, Tailwind, dan Laravel. Fokus pada hierarki visual yang jelas, waktu muat cepat, dan kode yang mudah dirawat.",
    tags: ["React", "Laravel", "Tailwind"],
  },
] as const;

export const howIWorkSteps = [
  {
    n: "01",
    title: { en: "Discover", id: "Pahami" },
    body: {
      en: "We review the brief, technical constraints, and references before I open an editor.",
      id: "Kita membahas brief, batasan teknis, dan referensi sebelum saya membuka editor.",
    },
    out: "Scope doc",
  },
  {
    n: "02",
    title: { en: "Architect", id: "Rancang" },
    body: {
      en: "I map the design tokens, data models, and component structure so core decisions are settled early.",
      id: "Saya memetakan token desain, model data, dan struktur komponen agar keputusan inti selesai lebih awal.",
    },
    out: "Tokens + schema",
  },
  {
    n: "03",
    title: { en: "Build", id: "Bangun" },
    body: {
      en: "I implement screens, API integration, and interaction details in Flutter or React with regular review builds.",
      id: "Saya mengerjakan tampilan, integrasi API, dan detail interaksi di Flutter atau React dengan build rutin untuk ditinjau.",
    },
    out: "Weekly builds",
  },
  {
    n: "04",
    title: { en: "Ship", id: "Rilis" },
    body: {
      en: "Final QA, performance checks, and written handoff documentation covering setup, architecture, and deployment.",
      id: "QA akhir, pemeriksaan performa, dan dokumentasi serah terima yang mencakup setup, arsitektur, serta deployment.",
    },
    out: "Handoff docs",
  },
] as const;

export const keyNumbers = [
  { value: "5+", label: "Years building" },
  { value: "8", label: "Shipped projects" },
  { value: "1", label: "Play Store app" },
] as const;

/**
 * Secondary projects, shown as the archive table on the homepage.
 * Count and year range in OtherProjectsSection are computed automatically.
 */
export const archive = [
  {
    year: "2025",
    project: "Bolasoft Arena",
    category: "React SPA Revamp",
    stack: "React, TypeScript, REST",
    artifact: "Client platform",
  },
  {
    year: "2025",
    project: "EduApp",
    category: "Fullstack Web",
    stack: "Laravel, Tailwind, ResponsiveVoice",
    artifact: "Full app",
  },
  {
    year: "2024",
    project: "Weebase",
    category: "Mobile · Play Store",
    stack: "Flutter, REST API",
    artifact: "Live on Play Store",
  },
  {
    year: "2024",
    project: "SampahIn",
    category: "Mobile & UI/UX",
    stack: "Flutter, OpenStreetMap",
    artifact: "3-role ecosystem",
  },
  {
    year: "2024",
    project: "ReBio",
    category: "Mobile · HKI Registered",
    stack: "Flutter, Bank Sampah",
    artifact: "HKI certified",
  },
] as const;

export const faqItems = {
  en: [
    [
      "Are you available for new work?",
      "I work full-time at Rekatama, so I take freelance work in the evenings and on weekends. Focused scopes, code audits, and design-to-code builds fit best.",
    ],
    [
      "Do you work remotely?",
      "Yes. I am based in Purwokerto, Indonesia (GMT+7), working async by default with overlap into European afternoons.",
    ],
    [
      "What is your stack?",
      "Flutter and Dart for mobile; React, TypeScript, and Tailwind for web; Laravel when the project also needs backend work.",
    ],
    [
      "Can you join an existing codebase?",
      "Yes. I read through the existing structure and trace the main bottlenecks first before proposing any refactor.",
    ],
    [
      "How do you price work?",
      "Fixed price per milestone for defined scopes, or a day rate for ongoing collaboration.",
    ],
    [
      "What happens after launch?",
      "You get handoff documentation, a walkthrough recording of the codebase, and 30 days of bug fixes.",
    ],
  ] as ReadonlyArray<readonly [string, string]>,
  id: [
    [
      "Apakah sedang menerima proyek baru?",
      "Saat ini saya bekerja full-time di Rekatama, jadi proyek freelance berjalan pada malam hari dan akhir pekan. Lingkup terfokus, audit kode, dan slicing desain ke kode paling cocok.",
    ],
    [
      "Apakah bisa bekerja secara remote?",
      "Bisa. Saya berdomisili di Purwokerto, Indonesia (WIB / GMT+7), bekerja secara asinkron dengan waktu overlap pada sore hari waktu Eropa.",
    ],
    [
      "Stack apa yang biasa dipakai?",
      "Flutter dan Dart untuk mobile; React, TypeScript, dan Tailwind untuk web; Laravel bila proyek juga membutuhkan backend.",
    ],
    [
      "Bisa masuk ke codebase yang sudah ada?",
      "Bisa. Saya pelajari dulu struktur kode yang ada dan memetakan titik masalahnya sebelum mengusulkan refactor.",
    ],
    [
      "Bagaimana skema biayanya?",
      "Harga tetap per milestone untuk ruang lingkup yang sudah jelas, atau tarif harian untuk kolaborasi berkelanjutan.",
    ],
    [
      "Bagaimana dukungan setelah rilis?",
      "Anda mendapatkan dokumentasi serah terima, rekaman walkthrough codebase, dan 30 hari perbaikan bug.",
    ],
  ] as ReadonlyArray<readonly [string, string]>,
} as const;

export const cvData = {
  year: "2026",
  pdfHref: "/cv/bintang-fadilah-cv.pdf",
  education: [
    {
      school: "Universitas Amikom Purwokerto",
      degree: { en: "Information Systems", id: "Sistem Informasi" },
      period: "2023 - present",
    },
    {
      school: "SMK Negeri 1 Purwokerto",
      degree: { en: "Software Engineering", id: "Rekayasa Perangkat Lunak" },
      period: "2021",
    },
  ],
  certifications: [
    {
      title: "HKI: ReBio (bank sampah application)",
      issuer: "Ditjen Kekayaan Intelektual, Kumham RI",
      period: "2024",
    },
    {
      title: "Dicoding: Flutter Developer Expert",
      issuer: "Clean architecture · TDD · BLoC · CI/CD",
      period: "2022",
    },
  ],
  organisation: [
    {
      role: {
        en: "Mobile Secretary, Programming · UKM Intermedia",
        id: "Sekretaris Mobile, Divisi Programming · UKM Intermedia",
      },
      period: "2023 - 2025",
    },
    {
      role: {
        en: "Competition Coordinator · Intermedia IT Competition",
        id: "Koordinator Kompetisi · Intermedia IT Competition",
      },
      period: "2024 - 2025",
    },
  ],
  skillGroups: [
    { label: "Mobile", items: "Flutter · Dart · BLoC · Clean Architecture" },
    { label: "Web", items: "React · TypeScript · Tailwind · Laravel · PHP" },
    { label: "Design", items: "Figma · Design Systems · Prototyping" },
    { label: "Tooling", items: "Git · REST · Postman · Play Console" },
  ],
} as const;
