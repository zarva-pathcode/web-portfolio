export const site = {
  brand: 'ZARVAISM',
  name: 'Bintang Fadilah Ramadhan',
  role: 'Mobile & Frontend Developer',
  location: 'Purwokerto, Indonesia',
  email: 'bintangfara363@gmail.com',
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

/** Single-page anchors. CV is the one item that leaves the page. */
export const nav = [
  { label: 'Home', href: '#hero' },
  { label: 'About', href: '#about' },
  { label: 'Experience', href: '#experience' },
  { label: 'Project', href: '#projects' },
  { label: 'CV', href: 'cv' },
] as const;

export const disciplines = [
  {
    index: '01',
    slug: 'Mobile',
    title: 'Flutter Development',
    body: 'Developing cross-platform mobile applications for Android. I use Flutter to build smooth, native-like experiences on clean, scalable structure.',
    tags: ['Flutter', 'Dart', 'BLoC'],
  },
  {
    index: '02',
    slug: 'Systems',
    title: 'UI/UX Design',
    body: 'Translating concepts into visually engaging, user-centric interfaces. I build high-fidelity prototypes and design systems in Figma that are ready for development handover.',
    tags: ['Figma', 'Design Systems', 'Prototyping'],
  },
  {
    index: '03',
    slug: 'Engineering',
    title: 'Web Development',
    body: 'Building responsive, accessible web applications with React, Laravel and Tailwind — interfaces that look sharp and run smoothly.',
    tags: ['React', 'Laravel', 'Tailwind'],
  },
] as const;

/** The four-track strip that closes the hero. */
export const heroDisciplines = [
  { index: '01', title: 'Mobile Development', sub: 'Flutter & Native Android' },
  { index: '02', title: 'UI/UX Design', sub: 'Visual Precision' },
  { index: '03', title: 'Clean Architecture', sub: 'BLoC & State Management' },
  { index: '04', title: 'Frontend Engineering', sub: 'React & TypeScript' },
] as const;

export const keyNumbers = [
  { value: '5+', label: 'Years craft' },
  { value: '8', label: 'Projects shipped' },
  { value: '1', label: 'Play Store app' },
] as const;

/**
 * Secondary projects, shown as the archive table on the homepage.
 * `artifact` names what exists for each one — none of these are public repos, so
 * the column is descriptive rather than a link.
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
