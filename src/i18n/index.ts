export const locales = ['en', 'id'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

const en = {
  'meta.siteTitle': 'Zarvaism | Bintang Fadilah Ramadhan, Mobile & Frontend Developer',
  'meta.description':
    'Mobile and Frontend Developer working with Flutter, React, and TypeScript. Building production apps with Clean Architecture, BLoC state management, and REST APIs.',

  'nav.menu': 'Menu',
  'nav.skip': 'Skip to content',
  'nav.theme': 'Switch to Indonesian',
  'nav.contrastOn': 'Turn off high contrast',
  'nav.contrastOff': 'Turn on high contrast',

  'hero.headline': 'I build mobile and web apps',
  'hero.headlineAccent': 'built to last.',
  'hero.sub':
    'Flutter and React developer based in Purwokerto. I design interfaces in Figma, structure code with BLoC or TypeScript, and ship apps to production.',
  'hero.ctaPrimary': 'See Selected Work',
  'hero.ctaSecondary': 'Email Me',

  'about.index': 'About',
  'about.title': 'Mobile and frontend engineering with a design background.',
  'about.body':
    'Hi, I am Bintang Fadilah Ramadhan. I design interfaces in Figma and implement them in Flutter and React, keeping the codebase structured for the next team.',
  'about.body2':
    'Most of my work sits between UI design and client architecture: state management, API integration, and responsive layouts that hold up in daily use.',
  'about.subhead': 'Mobile & Frontend Developer',
  'about.subtitle': 'From Figma layouts to production builds.',
  'about.subbody':
    'Clear component structure, predictable BLoC or TypeScript state, and interfaces that stay readable on real devices.',
  'about.focus': 'Flutter & React',
  'about.status': 'Open for freelance',

  'disciplines.eyebrow': 'Services',
  'disciplines.title': 'What I Build',
  'disciplines.lede': 'Mobile apps, web interfaces, and Figma systems ready for implementation.',

  'experience.eyebrow': 'Career Timeline',
  'experience.title': 'Work Experience',
  'experience.lede': 'Roles across mobile engineering, frontend revamps, and teaching.',
  'experience.stepOf': 'Step {current} of {total}',

  'projects.eyebrow': 'Selected Case Studies',
  'projects.title': 'Featured Projects.',
  'projects.lede': 'Three projects covering mobile engineering, tournament ticketing UI, and web architecture.',
  'projects.viewCase': 'Read Case Study',
  'projects.problem': 'The problem',
  'projects.approach': 'The approach',
  'projects.result': 'The result',
  'projects.highlights': 'Key work',
  'projects.gallery': 'In the app',
  'projects.stack': 'Stack',
  'projects.next': 'Next project',
  'projects.back': 'Back to home',

  'archive.eyebrow': 'Archive',
  'archive.title': 'Other Projects.',
  'archive.lede': 'Additional client platforms, mobile releases, and academic or HKI-registered builds.',
  'archive.colYear': 'Year',
  'archive.colProject': 'Project',
  'archive.colCategory': 'Category',
  'archive.colStack': 'Tech Stack',
  'archive.colArtifact': 'Artifact',

  'contact.index': 'Contact',
  'contact.title': 'Work together',
  'contact.lede': 'Have a freelance scope, a role, or a question about one of these builds? Send an email.',
  'contact.name': 'Name',
  'contact.nameHint': 'The name you would like me to use.',
  'contact.email': 'Email',
  'contact.emailHint': 'A working email address so I can reply.',
  'contact.message': 'Message',
  'contact.messageHint': 'A few lines about the project, role, or question.',
  'contact.send': 'Send message',
  'contact.sending': 'Sending...',
  'contact.success': 'Message sent. Thanks, I will reply shortly.',
  'contact.error': 'Something went wrong. Please try again or email me directly.',

  'footer.tagline': 'Work together',
  'footer.rights': 'All rights reserved',
  'footer.builtWith': 'Built with',

  'blog.index': 'Writing',
  'blog.title': 'Build notes',
  'blog.lede': 'Notes on Flutter, frontend architecture, and the decisions behind my projects.',
  'blog.minRead': 'min read',
  'blog.empty': 'No posts yet. Check back soon.',
  'blog.back': 'All posts',
  'blog.published': 'Published',

  'cv.title': 'Curriculum Vitae',
  'cv.lede': 'A printable single-page summary of my work and education.',
  'cv.print': 'Print / Save as PDF',
  'cv.summary': 'Summary',
  'cv.education': 'Education',
  'cv.experience': 'Work Experience',
  'cv.projects': 'Key Projects',
  'cv.certifications': 'Certifications',
  'cv.organisation': 'Organisation & Committees',
  'cv.skills': 'Skills',

  'common.back': 'Back',
  'error.404title': 'Page not found',
  'error.404body': 'This page may have moved, or the URL has a typo.',
  'error.404cta': 'Back to home',
} as const;

export type TranslationKey = keyof typeof en;

const id: Record<TranslationKey, string> = {
  'meta.siteTitle': 'Zarvaism | Bintang Fadilah Ramadhan, Mobile & Frontend Developer',
  'meta.description':
    'Mobile dan Frontend Developer dengan Flutter, React, dan TypeScript. Membangun aplikasi produksi dengan Clean Architecture, BLoC, dan integrasi REST API.',

  'nav.menu': 'Menu',
  'nav.skip': 'Lompat ke konten',
  'nav.theme': 'Ganti ke Inggris',
  'nav.contrastOn': 'Matikan kontras tinggi',
  'nav.contrastOff': 'Nyalakan kontras tinggi',

  'hero.headline': 'Saya membangun aplikasi mobile dan web',
  'hero.headlineAccent': 'yang rapi dipakai.',
  'hero.sub':
    'Developer Flutter dan React di Purwokerto. Saya merancang antarmuka di Figma, menyusun kode dengan BLoC atau TypeScript, lalu merilisnya sampai produksi.',
  'hero.ctaPrimary': 'Lihat Karya Pilihan',
  'hero.ctaSecondary': 'Kirim Email',

  'about.index': 'Tentang',
  'about.title': 'Pengembangan mobile dan frontend dengan latar desain.',
  'about.body':
    'Halo, saya Bintang Fadilah Ramadhan. Saya merancang antarmuka di Figma dan mengimplementasikannya dengan Flutter serta React, dengan struktur kode yang mudah dilanjutkan tim berikutnya.',
  'about.body2':
    'Sebagian besar pekerjaan saya berada di titik temu desain antarmuka dan arsitektur aplikasi: state management, integrasi API, dan tata letak responsif untuk pemakaian harian.',
  'about.subhead': 'Mobile & Frontend Developer',
  'about.subtitle': 'Dari rancangan Figma sampai rilis produksi.',
  'about.subbody':
    'Struktur komponen yang rapi, state BLoC atau TypeScript yang terukur, dan antarmuka yang tetap nyaman dipakai di perangkat nyata.',
  'about.focus': 'Flutter & React',
  'about.status': 'Terbuka untuk freelance',

  'disciplines.eyebrow': 'Layanan',
  'disciplines.title': 'Yang Saya Kerjakan',
  'disciplines.lede': 'Aplikasi mobile, antarmuka web, dan sistem desain Figma yang siap diimplementasikan.',

  'experience.eyebrow': 'Riwayat Karier',
  'experience.title': 'Pengalaman Kerja',
  'experience.lede': 'Pengalaman membangun aplikasi mobile, revamp frontend, dan mengajar praktikum.',
  'experience.stepOf': 'Tahap {current} dari {total}',

  'projects.eyebrow': 'Studi Kasus Pilihan',
  'projects.title': 'Proyek Pilihan.',
  'projects.lede': 'Tiga proyek yang mencakup pengembangan mobile, desain tiket turnamen, dan arsitektur web.',
  'projects.viewCase': 'Baca Studi Kasus',
  'projects.problem': 'Masalahnya',
  'projects.approach': 'Pendekatan',
  'projects.result': 'Hasilnya',
  'projects.highlights': 'Yang dikerjakan',
  'projects.gallery': 'Dalam aplikasi',
  'projects.stack': 'Stack',
  'projects.next': 'Proyek berikutnya',
  'projects.back': 'Kembali ke beranda',

  'archive.eyebrow': 'Arsip',
  'archive.title': 'Proyek Lainnya.',
  'archive.lede': 'Daftar platform klien, rilis aplikasi mobile, serta proyek kampus dan HKI lainnya.',
  'archive.colYear': 'Tahun',
  'archive.colProject': 'Proyek',
  'archive.colCategory': 'Kategori',
  'archive.colStack': 'Tech Stack',
  'archive.colArtifact': 'Status',

  'contact.index': 'Kontak',
  'contact.title': 'Mari bekerja sama',
  'contact.lede': 'Punya proyek freelance, lowongan, atau pertanyaan teknis tentang salah satu karya di sini? Silakan kirim email.',
  'contact.name': 'Nama',
  'contact.nameHint': 'Nama yang Anda ingin saya gunakan saat membalas.',
  'contact.email': 'Email',
  'contact.emailHint': 'Alamat email aktif agar saya bisa membalas.',
  'contact.message': 'Pesan',
  'contact.messageHint': 'Ceritakan singkat tentang proyek, posisi, atau pertanyaan Anda.',
  'contact.send': 'Kirim pesan',
  'contact.sending': 'Mengirim...',
  'contact.success': 'Pesan terkirim. Terima kasih, saya akan segera membalas.',
  'contact.error': 'Terjadi kesalahan. Silakan coba lagi atau kirim email langsung.',

  'footer.tagline': 'Mari bekerja sama',
  'footer.rights': 'Seluruh hak cipta dilindungi',
  'footer.builtWith': 'Dibangun dengan',

  'blog.index': 'Tulisan',
  'blog.title': 'Catatan teknis',
  'blog.lede': 'Catatan tentang Flutter, arsitektur frontend, dan keputusan teknis di balik proyek saya.',
  'blog.minRead': 'menit baca',
  'blog.empty': 'Belum ada tulisan. Cek kembali nanti.',
  'blog.back': 'Semua tulisan',
  'blog.published': 'Terbit',

  'cv.title': 'Curriculum Vitae',
  'cv.lede': 'Ringkasan pengalaman kerja dan pendidikan satu halaman yang siap dicetak.',
  'cv.print': 'Cetak / Simpan PDF',
  'cv.summary': 'Ringkasan',
  'cv.education': 'Pendidikan',
  'cv.experience': 'Pengalaman Kerja',
  'cv.projects': 'Proyek Utama',
  'cv.certifications': 'Sertifikasi',
  'cv.organisation': 'Organisasi & Kepanitiaan',
  'cv.skills': 'Keahlian',

  'common.back': 'Kembali',
  'error.404title': 'Halaman tidak ditemukan',
  'error.404body': 'Halaman ini mungkin sudah dipindahkan, atau alamat URL-nya salah ketik.',
  'error.404cta': 'Kembali ke beranda',
};

const dicts: Record<Locale, Record<TranslationKey, string>> = { en, id };

export function t(locale: Locale): Record<TranslationKey, string> {
  return dicts[locale];
}

export const localePrefix = (locale: Locale): string =>
  locale === defaultLocale ? '' : `/${locale}`;

export function localePath(locale: Locale, path: string): string {
  const clean = path === '/' ? '' : path.replace(/\/$/, '');
  return `${localePrefix(locale)}${clean}` || '/';
}

export function isLocale(value: string | undefined): value is Locale {
  return value === 'en' || value === 'id';
}

export function localeFromPath(pathname: string): Locale {
  const [, maybeLocale] = pathname.split('/');
  return isLocale(maybeLocale) ? maybeLocale : defaultLocale;
}

/*
 * Reads the *second* segment, not the first. `'/id'.split('/')` is `['', 'id']`,
 * so the first element is an empty string and the bare locale home page fell
 * through the check unchanged, which is why the switcher on `/id` produced
 * `/id` instead of `/`.
 */
export function pathWithoutLocale(pathname: string): string {
  const [, maybeLocale, ...rest] = pathname.split('/');
  if (!isLocale(maybeLocale)) return pathname;
  return rest.length ? `/${rest.join('/')}` : '/';
}

/**
 * Where the language switcher should send the visitor, for a target locale.
 *
 * `/id/projects/artiva` -> `/projects/artiva` (to 'en')
 * `/projects/artiva`     -> `/id/projects/artiva` (to 'id')
 *
 * Blog posts declare their own `lang` in frontmatter and each route is built
 * from that, so swapping the prefix lands on the target language blog index
 * instead of a 404.
 */
export function swapLocale(pathname: string, to: Locale): string {
  const bare = pathWithoutLocale(pathname);
  return localePath(to, /^\/blog\/[^/]+\/?$/.test(bare) ? '/blog' : bare);
}
