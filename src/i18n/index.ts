export const locales = ['en', 'id'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

const en = {
  'meta.siteTitle': 'Zarvaism — Bintang Fadilah Ramadhan, Mobile & Frontend Developer',
  'meta.description':
    'Mobile and Frontend Developer working with Flutter, React and TypeScript. Building production apps with Clean Architecture, BLoC and AI integration.',

  'nav.menu': 'Menu',
  'nav.skip': 'Skip to content',
  'nav.theme': 'Switch to Indonesian',

  'hero.headline': 'Crafting mobile and web apps that feel effortless to use.',
  'hero.sub':
    'I build Flutter and React front-ends with clean architecture — taking complex requirements and turning them into interfaces people pick up without a tutorial.',
  'hero.ctaPrimary': 'Explore Work',
  'hero.ctaSecondary': 'Get in touch',

  'about.index': 'About',
  'about.title': 'Passionate about crafting visuals that speak through design.',
  'about.body':
    'Hi, I’m Bintang Fadilah Ramadhan. I enjoy turning complex ideas into quiet, intuitive interactive experiences — balancing meticulous visual craft with robust functional logic.',
  'about.body2':
    'For me, coding is not just about writing lines of code, but about solving problems and creating apps that people genuinely enjoy using. Every pixel and micro-interaction is engineered with restraint and purpose.',
  'about.subhead': 'Creative Technologist',
  'about.subtitle': 'Turning ideas into interactive experiences.',
  'about.subbody':
    'Paying attention to both the visual details and the structural logic behind them. Clean architecture meets human-centered aesthetics.',
  'about.focus': 'Flutter & React',
  'about.status': 'Open to opportunities',

  'disciplines.eyebrow': 'Services & Craft',
  'disciplines.title': 'What I Do',
  'disciplines.lede':
    'Turning complex ideas into functional digital products. Here is how I can help you.',

  'experience.eyebrow': 'Career Timeline & Trajectory',
  'experience.title': 'Work Experience',
  'experience.lede':
    'A chronology of production engineering, design systems and product delivery.',

  'projects.eyebrow': 'Selected Works & Case Studies',
  'projects.title': 'Featured Projects.',
  'projects.lede':
    'A curation of digital products engineered with typographic clarity, cross-platform architecture, and fluid human-centric interactions.',
  'projects.viewCase': 'View Case Study',
  'projects.problem': 'The problem',
  'projects.approach': 'The approach',
  'projects.result': 'The result',
  'projects.highlights': 'What it took',
  'projects.gallery': 'In the app',
  'projects.stack': 'Stack',
  'projects.next': 'Next project',
  'projects.back': 'Back to home',

  'archive.eyebrow': 'Archive & Experiments',
  'archive.title': 'Other Projects.',
  'archive.lede':
    'A catalog of secondary ventures, open-source modules, exploratory UI experiments, and micro-tools.',
  'archive.colYear': 'Year',
  'archive.colProject': 'Project',
  'archive.colCategory': 'Category',
  'archive.colStack': 'Tech Stack',
  'archive.colArtifact': 'Artifact',

  'contact.index': 'Contact',
  'contact.title': "Let's work together",
  'contact.lede':
    'Got a role, a project, or just a question about how something was built? My inbox is open.',
  'contact.name': 'Name',
  'contact.email': 'Email',
  'contact.message': 'Message',
  'contact.send': 'Send message',
  'contact.sending': 'Sending…',
  'contact.success': 'Message sent. Thanks — I will get back to you shortly.',
  'contact.error': 'Something went wrong. Please try again or email me directly.',

  'footer.tagline': "Let's work together",
  'footer.rights': 'All rights reserved',
  'footer.builtWith': 'Built with',

  'blog.index': 'Writing',
  'blog.title': 'Notes from the build',
  'blog.lede': 'Occasional writing on mobile engineering, UI/UX and the tools in between.',
  'blog.minRead': 'min read',
  'blog.empty': 'No posts yet — check back soon.',
  'blog.back': 'All posts',
  'blog.published': 'Published',

  'cv.title': 'Curriculum Vitae',
  'cv.lede': 'A printable, single-page version of my resume.',
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
  'error.404body': 'This page does not exist, or it moved somewhere else.',
  'error.404cta': 'Back home',
} as const;

export type TranslationKey = keyof typeof en;

const id: Record<TranslationKey, string> = {
  'meta.siteTitle': 'Zarvaism — Bintang Fadilah Ramadhan, Mobile & Frontend Developer',
  'meta.description':
    'Mobile dan Frontend Developer yang bekerja dengan Flutter, React, dan TypeScript. Membangun aplikasi produksi dengan Clean Architecture, BLoC, dan integrasi AI.',

  'nav.menu': 'Menu',
  'nav.skip': 'Lompat ke konten',
  'nav.theme': 'Ganti ke Inggris',

  'hero.headline': 'Membangun aplikasi mobile dan web yang terasa mudah dipakai.',
  'hero.sub':
    'Saya membangun front-end dengan Flutter dan React di atas arsitektur yang bersih — mengubah requirement rumit menjadi antarmuka yang bisa dipakai tanpa perlu tutorial.',
  'hero.ctaPrimary': 'Lihat Karya',
  'hero.ctaSecondary': 'Hubungi Saya',

  'about.index': 'Tentang',
  'about.title': 'Rasa ingin merancang visual yang berbicara lewat desain.',
  'about.body':
    'Halo, saya Bintang Fadilah Ramadhan. Saya mengubah ide rumit menjadi pengalaman interaktif yang tenang dan intuitif — menyeimbangkan ketelitian visual dengan logika fungsional yang kuat.',
  'about.body2':
    'Bagi saya, menulis kode bukan sekadar membuat barisan kode, tetapi menyelesaikan masalah dan membuat aplikasi yang benar-benar menyenangkan dipakai. Setiap piksel dan interaksi kecil dirancang dengan sadar dan terarah.',
  'about.subhead': 'Creative Technologist',
  'about.subtitle': 'Mengubah ide menjadi pengalaman interaktif.',
  'about.subbody':
    'Memperhatikan detail visual sekaligus logika struktural di baliknya. Arsitektur bersih bertemu estetika yang berorientasi pada pengguna.',
  'about.focus': 'Flutter & React',
  'about.status': 'Terbuka untuk peluang',

  'disciplines.eyebrow': 'Layanan & Keahlian',
  'disciplines.title': 'Yang Saya Kerjakan',
  'disciplines.lede':
    'Mengubah ide rumit menjadi produk digital yang fungsional. Inilah cara saya bisa membantu.',

  'experience.eyebrow': 'Lintasan Karier',
  'experience.title': 'Pengalaman Kerja',
  'experience.lede':
    'Sejarah rekayasa produksi, design system, dan pengiriman produk.',

  'projects.eyebrow': 'Karya Terpilih & Studi Kasus',
  'projects.title': 'Proyek Pilihan.',
  'projects.lede':
    'Kurasi produk digital yang dibangun dengan kejelasan tipografi, arsitektur lintas platform, dan interaksi yang mengalir.',
  'projects.viewCase': 'Lihat Studi Kasus',
  'projects.problem': 'Masalahnya',
  'projects.approach': 'Pendekatan',
  'projects.result': 'Hasilnya',
  'projects.highlights': 'Yang saya kerjakan',
  'projects.gallery': 'Dalam aplikasi',
  'projects.stack': 'Stack',
  'projects.next': 'Proyek berikutnya',
  'projects.back': 'Kembali ke beranda',

  'archive.eyebrow': 'Arsip & Eksperimen',
  'archive.title': 'Proyek Lainnya.',
  'archive.lede':
    'Katalog venture kedua, modul open-source, eksperimen antarmuka, dan alat kecil.',
  'archive.colYear': 'Tahun',
  'archive.colProject': 'Proyek',
  'archive.colCategory': 'Kategori',
  'archive.colStack': 'Tech Stack',
  'archive.colArtifact': 'Bukti',

  'contact.index': 'Kontak',
  'contact.title': 'Mari bekerja sama',
  'contact.lede':
    'Punya lowongan, proyek, atau sekadar penasaran bagaimana sesuatu dibangun? Email saya terbuka.',
  'contact.name': 'Nama',
  'contact.email': 'Email',
  'contact.message': 'Pesan',
  'contact.send': 'Kirim pesan',
  'contact.sending': 'Mengirim…',
  'contact.success': 'Pesan terkirim. Terima kasih — saya akan segera membalas.',
  'contact.error': 'Terjadi kesalahan. Silakan coba lagi atau kirim email langsung.',

  'footer.tagline': 'Mari bekerja sama',
  'footer.rights': 'Seluruh hak cipta dilindungi',
  'footer.builtWith': 'Dibangun dengan',

  'blog.index': 'Menulis',
  'blog.title': 'Catatan dari proses bangun',
  'blog.lede': 'Tulisan sesekali tentang rekayasa mobile, UI/UX, dan perkakas di antaranya.',
  'blog.minRead': 'menit',
  'blog.empty': 'Belum ada tulisan — cek lagi nanti.',
  'blog.back': 'Semua tulisan',
  'blog.published': 'Terbit',

  'cv.title': 'Curriculum Vitae',
  'cv.lede': 'Versi satu halaman dari resume saya, siap dicetak.',
  'cv.print': 'Cetak / Simpan PDF',
  'cv.summary': 'Ringkasan',
  'cv.education': 'Pendidikan',
  'cv.experience': 'Pengalaman Kerja',
  'cv.projects': 'Proyek Utama',
  'cv.certifications': 'Sertifikasi',
  'cv.organisation': 'Organisasi & Kepanitiaan',
  'cv.skills': 'Kemampuan',

  'common.back': 'Kembali',
  'error.404title': 'Halaman tidak ditemukan',
  'error.404body': 'Halaman ini tidak ada, atau sudah dipindahkan ke tempat lain.',
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
  const [, first] = pathname.split('/');
  return isLocale(first) ? first : defaultLocale;
}

export function pathWithoutLocale(pathname: string): string {
  const [first, ...rest] = pathname.split('/');
  return isLocale(first) ? `/${rest.join('/')}` || '/' : pathname;
}
