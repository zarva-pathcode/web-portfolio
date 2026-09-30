import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      year: z.number(),
      role: z.string(),
      /** Short category used in the index line: "01 / Mobile & AI". */
      category: z.string(),
      /** Platform blurb for the same line: "Android & iOS". */
      platform: z.string(),
      /** Filename shown in the screenshot panel chrome. */
      panelLabel: z.string(),
      /** Key into the generated blur-up placeholder map. */
      lqip: z.string(),
      summary: z.string(),
      cover: image(),
      coverAlt: z.string(),
      coverPosition: z.string().default('center'),
      // Landscape screenshots can bleed edge to edge; portrait or transparent
      // mockups need to sit inside the frame instead of being cropped.
      coverFit: z.enum(['cover', 'contain']).default('cover'),
      featured: z.boolean().default(false),
      order: z.number().default(0),
      stack: z.array(z.string()),
      // TODO: replace these three figures per project with real numbers.
      metrics: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
      problem: z.string(),
      approach: z.string(),
      result: z.string(),
      highlights: z.array(z.string()).default([]),
      gallery: z.array(image()).default([]),
      links: z
        .array(z.object({ label: z.string(), href: z.string() }))
        .default([]),
    }),
});

const experiences = defineCollection({
  loader: glob({ base: './src/content/experiences', pattern: '**/*.md' }),
  schema: z.object({
    company: z.string(),
    role: z.string(),
    /** Engagement type badge, e.g. "Full-time" or "Contract". */
    type: z.string(),
    location: z.string(),
    period: z.string(),
    order: z.number(),
    project: z.string().optional(),
    summary: z.string(),
    stack: z.array(z.string()),
    points: z.array(z.string()),
  }),
});

const posts = defineCollection({
  loader: glob({
    base: './src/content/blog',
    pattern: '**/*.md',
    // Slug should be the filename only, not "en/why-astro" — the locale is
    // carried in frontmatter and decides the route prefix instead.
    generateId: ({ entry }) => entry.replace(/^.*[\\/]/, '').replace(/\.mdx?$/, ''),
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      lang: z.enum(['en', 'id']).default('en'),
      tags: z.array(z.string()).default([]),
      cover: image().optional(),
    }),
});

export const collections = { projects, experiences, posts };
