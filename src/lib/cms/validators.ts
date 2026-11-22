import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const localizedStringSchema = z.object({
  en: z.string().trim().min(1),
  id: z.string().trim().min(1),
});

export const heroSectionSchema = z.object({
  eyebrowRole: z.string().trim().min(1),
  availability: localizedStringSchema,
  headline: localizedStringSchema,
  headlineAccent: localizedStringSchema,
  sub: localizedStringSchema,
  ctaPrimary: localizedStringSchema,
  ctaSecondary: localizedStringSchema,
  stats: z.array(
    z.object({
      value: z.string().trim().min(1),
      label: localizedStringSchema,
    })
  ),
  ticker: z.array(z.string().trim().min(1)),
  portraitUrl: z.string().trim().default(''),
});

export const aboutSectionSchema = z.object({
  statement: localizedStringSchema,
  body: localizedStringSchema,
  meta: z.object({
    en: z.array(z.tuple([z.string().trim().min(1), z.string().trim().min(1)])),
    id: z.array(z.tuple([z.string().trim().min(1), z.string().trim().min(1)])),
  }),
  disciplines: z.array(
    z.object({
      index: z.string().trim().min(1),
      slug: z.string().trim().min(1),
      title: z.string().trim().min(1),
      body: z.string().trim().min(1),
      bodyId: z.string().trim().min(1),
      tags: z.array(z.string().trim().min(1)),
    })
  ),
});

export const howSectionSchema = z.object({
  title: localizedStringSchema,
  lede: localizedStringSchema,
  steps: z.array(
    z.object({
      n: z.string().trim().min(1),
      title: localizedStringSchema,
      body: localizedStringSchema,
      out: z.string().trim().min(1),
    })
  ),
});

export const otherProjectsSectionSchema = z.object({
  title: localizedStringSchema,
  items: z.array(
    z.object({
      year: z.string().trim().min(1),
      project: z.string().trim().min(1),
      category: z.string().trim().min(1),
      stack: z.string().trim().min(1),
      artifact: z.string().trim().min(1),
    })
  ),
});

export const faqSectionSchema = z.object({
  title: localizedStringSchema,
  items: z.object({
    en: z.array(z.tuple([z.string().trim().min(1), z.string().trim().min(1)])),
    id: z.array(z.tuple([z.string().trim().min(1), z.string().trim().min(1)])),
  }),
});

export const cvSectionSchema = z.object({
  year: z.string().trim().min(1),
  pdfHref: z.string().trim().min(1),
  education: z.array(
    z.object({
      school: z.string().trim().min(1),
      degree: localizedStringSchema,
      period: z.string().trim().min(1),
    })
  ),
  certifications: z.array(
    z.object({
      title: z.string().trim().min(1),
      issuer: z.string().trim().min(1),
      period: z.string().trim().min(1),
    })
  ),
  organisation: z.array(
    z.object({
      role: localizedStringSchema,
      period: z.string().trim().min(1),
    })
  ),
  skillGroups: z.array(
    z.object({
      label: z.string().trim().min(1),
      items: z.string().trim().min(1),
    })
  ),
});

export const settingsSectionSchema = z.object({
  brand: z.string().trim().min(1),
  name: z.string().trim().min(1),
  role: z.string().trim().min(1),
  location: z.string().trim().min(1),
  shortLocation: z.string().trim().min(1),
  email: z.string().trim().email(),
  description: localizedStringSchema,
  social: z.array(
    z.object({
      label: z.string().trim().min(1),
      handle: z.string().trim().min(1),
      href: z.string().trim().min(1),
    })
  ),
  footer: z.object({
    tickerMotto: localizedStringSchema,
    replyNote: localizedStringSchema,
    motto: localizedStringSchema,
  }),
});

export const sectionSchemas = {
  hero: heroSectionSchema,
  about: aboutSectionSchema,
  how: howSectionSchema,
  other_projects: otherProjectsSectionSchema,
  faq: faqSectionSchema,
  cv: cvSectionSchema,
  settings: settingsSectionSchema,
} as const;

export type SectionKey = keyof typeof sectionSchemas;

export type HeroSectionData = z.infer<typeof heroSectionSchema>;
export type AboutSectionData = z.infer<typeof aboutSectionSchema>;
export type HowSectionData = z.infer<typeof howSectionSchema>;
export type OtherProjectsSectionData = z.infer<typeof otherProjectsSectionSchema>;
export type FaqSectionData = z.infer<typeof faqSectionSchema>;
export type CvSectionData = z.infer<typeof cvSectionSchema>;
export type SettingsSectionData = z.infer<typeof settingsSectionSchema>;

export const experienceInputSchema = z.object({
  slug: z.string().trim().regex(slugRegex, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung'),
  company: z.string().trim().min(1),
  role: z.string().trim().min(1),
  type: z.string().trim().min(1),
  location: z.string().trim().min(1),
  period: z.string().trim().min(1),
  sortOrder: z.coerce.number().int().min(0).default(0),
  project: z.string().trim().default(''),
  summary: z.string().trim().min(1),
  stack: z.array(z.string().trim().min(1)).default([]),
  points: z.array(z.string().trim().min(1)).default([]),
});

export const experienceReorderSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1),
});

export const projectInputSchema = z.object({
  slug: z.string().trim().regex(slugRegex, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung'),
  title: z.string().trim().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  role: z.string().trim().min(1),
  category: z.string().trim().min(1),
  platform: z.string().trim().min(1),
  panelLabel: z.string().trim().default('case.study'),
  summary: z.string().trim().min(1),
  coverUrl: z.string().trim().min(1),
  coverAlt: z.string().trim().min(1),
  videoUrl: z.string().trim().default(''),
  coverPosition: z.string().trim().default('center'),
  featured: z.boolean().default(true),
  published: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
  stack: z.array(z.string().trim().min(1)).default([]),
  metrics: z
    .array(z.object({ value: z.string().trim().min(1), label: z.string().trim().min(1) }))
    .default([]),
  problem: z.string().trim().default(''),
  approach: z.string().trim().default(''),
  result: z.string().trim().default(''),
  highlights: z.array(z.string().trim().min(1)).default([]),
  gallery: z.array(z.string().trim().min(1)).default([]),
  links: z
    .array(z.object({ label: z.string().trim().min(1), href: z.string().trim().min(1) }))
    .default([]),
  bodyMarkdown: z.string().default(''),
});

export const postInputSchema = z.object({
  slug: z.string().trim().regex(slugRegex, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung'),
  lang: z.enum(['en', 'id']).default('en'),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  bodyMarkdown: z.string().trim().min(1),
  coverUrl: z.string().trim().default(''),
  tags: z.array(z.string().trim().min(1)).default([]),
  published: z.boolean().default(false),
  pubDate: z.string().trim().min(1),
  updatedDate: z.string().trim().default(''),
});
