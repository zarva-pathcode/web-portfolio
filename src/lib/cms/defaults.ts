import {
  site,
  social,
  heroTicker,
  heroStats,
  aboutContent,
  disciplines,
  howIWorkSteps,
  archive,
  faqItems,
  cvData,
} from '../../data/site';
import { t } from '../../i18n';
import type {
  AboutSectionData,
  CvSectionData,
  FaqSectionData,
  HeroSectionData,
  HowSectionData,
  OtherProjectsSectionData,
  SectionKey,
  SettingsSectionData,
} from './validators';

const enTr = t('en');
const idTr = t('id');

export function getDefaultSections(): {
  hero: HeroSectionData;
  about: AboutSectionData;
  how: HowSectionData;
  other_projects: OtherProjectsSectionData;
  faq: FaqSectionData;
  cv: CvSectionData;
  settings: SettingsSectionData;
} {
  return {
    hero: {
      eyebrowRole: site.role,
      availability: { ...site.availability },
      headline: {
        en: enTr['hero.headline'],
        id: idTr['hero.headline'],
      },
      headlineAccent: {
        en: enTr['hero.headlineAccent'],
        id: idTr['hero.headlineAccent'],
      },
      sub: {
        en: enTr['hero.sub'],
        id: idTr['hero.sub'],
      },
      ctaPrimary: {
        en: enTr['hero.ctaPrimary'],
        id: idTr['hero.ctaPrimary'],
      },
      ctaSecondary: {
        en: enTr['hero.ctaSecondary'],
        id: idTr['hero.ctaSecondary'],
      },
      stats: heroStats.map((s) => ({
        value: s.value,
        label: { ...s.label },
      })),
      ticker: [...heroTicker],
      portraitUrl: '',
    },
    about: {
      statement: {
        en: aboutContent.en.statement,
        id: aboutContent.id.statement,
      },
      body: {
        en: aboutContent.en.body,
        id: aboutContent.id.body,
      },
      meta: {
        en: aboutContent.en.meta.map(([k, v]) => [k, v] as [string, string]),
        id: aboutContent.id.meta.map(([k, v]) => [k, v] as [string, string]),
      },
      disciplines: disciplines.map((d) => ({
        index: d.index,
        slug: d.slug,
        title: d.title,
        body: d.body,
        bodyId: d.bodyId,
        tags: [...d.tags],
      })),
    },
    how: {
      title: {
        en: 'Four steps, clear handoff.',
        id: 'Empat tahap, alur jelas.',
      },
      lede: {
        en: 'I follow the same sequence for a two-week prototype and a multi-month product, so scope and trade-offs stay visible from day one.',
        id: 'Saya memakai alur yang sama untuk prototipe dua minggu maupun produk beberapa bulan, agar ruang lingkup dan keputusan teknis selalu jelas sejak awal.',
      },
      steps: howIWorkSteps.map((s) => ({
        n: s.n,
        title: { ...s.title },
        body: { ...s.body },
        out: s.out,
      })),
    },
    other_projects: {
      title: {
        en: 'Other projects.',
        id: 'Proyek lain.',
      },
      items: archive.map((item) => ({ ...item })),
    },
    faq: {
      title: {
        en: 'Common questions.',
        id: 'Pertanyaan umum.',
      },
      items: {
        en: faqItems.en.map(([q, a]) => [q, a] as [string, string]),
        id: faqItems.id.map(([q, a]) => [q, a] as [string, string]),
      },
    },
    cv: {
      year: cvData.year,
      pdfHref: cvData.pdfHref,
      education: cvData.education.map((e) => ({
        school: e.school,
        degree: { ...e.degree },
        period: e.period,
      })),
      certifications: cvData.certifications.map((c) => ({ ...c })),
      organisation: cvData.organisation.map((o) => ({
        role: { ...o.role },
        period: o.period,
      })),
      skillGroups: cvData.skillGroups.map((g) => ({ ...g })),
    },
    settings: {
      brand: site.brand,
      name: site.name,
      role: site.role,
      location: site.location,
      shortLocation: site.shortLocation,
      email: site.email,
      description: {
        en: enTr['meta.description'],
        id: idTr['meta.description'],
      },
      social: social.map((s) => ({ ...s })),
      footer: {
        tickerMotto: {
          en: 'Mobile & web engineering · Purwokerto, ID',
          id: 'Pengembangan mobile & web · Purwokerto, ID',
        },
        replyNote: {
          en: 'REPLIES WITHIN 24 HOURS · WIB (GMT+7)',
          id: 'DIBALAS DALAM 24 JAM · WIB (GMT+7)',
        },
        motto: {
          en: 'Built in Purwokerto. Open for select freelance work.',
          id: 'Dibuat di Purwokerto. Terbuka untuk proyek freelance terpilih.',
        },
      },
    },
  };
}

export function getDefaultSection<K extends SectionKey>(key: K) {
  return getDefaultSections()[key];
}
