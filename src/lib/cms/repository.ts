import crypto from 'node:crypto';
import { getCollection } from 'astro:content';
import { asc, desc, eq } from 'drizzle-orm';
import { ensureSchema, getDb } from '../../db/client';
import { experiences, mediaAssets, posts, projects, siteSections } from '../../db/schema';
import { getDefaultSection, getDefaultSections } from './defaults';
import {
  sectionSchemas,
  type AboutSectionData,
  type CvSectionData,
  type FaqSectionData,
  type HeroSectionData,
  type HowSectionData,
  type OtherProjectsSectionData,
  type SectionKey,
  type SettingsSectionData,
} from './validators';

export interface ExperienceRecord {
  id: string;
  slug: string;
  company: string;
  role: string;
  type: string;
  location: string;
  period: string;
  sortOrder: number;
  project: string;
  summary: string;
  stack: string[];
  points: string[];
  updatedAt: number;
}

export interface ProjectMetric {
  value: string;
  label: string;
}

export interface ProjectLink {
  label: string;
  href: string;
}

export interface ProjectRecord {
  id: string;
  slug: string;
  title: string;
  year: number;
  role: string;
  category: string;
  platform: string;
  panelLabel: string;
  summary: string;
  coverUrl: string;
  coverAlt: string;
  videoUrl: string;
  coverPosition: string;
  featured: boolean;
  published: boolean;
  sortOrder: number;
  stack: string[];
  metrics: ProjectMetric[];
  problem: string;
  approach: string;
  result: string;
  highlights: string[];
  gallery: string[];
  links: ProjectLink[];
  bodyMarkdown: string;
  updatedAt: number;
}

export interface PostRecord {
  id: string;
  slug: string;
  lang: 'en' | 'id';
  title: string;
  description: string;
  bodyMarkdown: string;
  coverUrl: string;
  tags: string[];
  published: boolean;
  pubDate: string;
  updatedDate: string;
  createdAt: number;
  updatedAt: number;
}

export interface MediaRecord {
  id: string;
  url: string;
  pathname: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: number;
}

export interface AllSectionsMap {
  hero: HeroSectionData;
  about: AboutSectionData;
  how: HowSectionData;
  other_projects: OtherProjectsSectionData;
  faq: FaqSectionData;
  cv: CvSectionData;
  settings: SettingsSectionData;
}

const DEFAULT_PROJECT_ASSETS: Record<string, { coverUrl: string; gallery: string[] }> = {
  coacivo: {
    coverUrl: '/images/projects/coacivo-cover.png',
    gallery: [],
  },
  'rektor-cup': {
    coverUrl: '/images/projects/rektor-cup-cover.png',
    gallery: [],
  },
  artiva: {
    coverUrl: '/images/projects/artiva-cover.png',
    gallery: ['/images/projects/artiva-gallery-1.png'],
  },
};

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mapExperience(row: typeof experiences.$inferSelect): ExperienceRecord {
  return {
    id: row.id,
    slug: row.slug,
    company: row.company,
    role: row.role,
    type: row.type,
    location: row.location,
    period: row.period,
    sortOrder: row.sortOrder,
    project: row.project,
    summary: row.summary,
    stack: parseJson<string[]>(row.stackJson, []),
    points: parseJson<string[]>(row.pointsJson, []),
    updatedAt: row.updatedAt,
  };
}

function mapProject(row: typeof projects.$inferSelect): ProjectRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    year: row.year,
    role: row.role,
    category: row.category,
    platform: row.platform,
    panelLabel: row.panelLabel,
    summary: row.summary,
    coverUrl: row.coverUrl,
    coverAlt: row.coverAlt,
    videoUrl: row.videoUrl,
    coverPosition: row.coverPosition,
    featured: row.featured,
    published: row.published,
    sortOrder: row.sortOrder,
    stack: parseJson<string[]>(row.stackJson, []),
    metrics: parseJson<ProjectMetric[]>(row.metricsJson, []),
    problem: row.problem,
    approach: row.approach,
    result: row.result,
    highlights: parseJson<string[]>(row.highlightsJson, []),
    gallery: parseJson<string[]>(row.galleryJson, []),
    links: parseJson<ProjectLink[]>(row.linksJson, []),
    bodyMarkdown: row.bodyMarkdown,
    updatedAt: row.updatedAt,
  };
}

function mapPost(row: typeof posts.$inferSelect): PostRecord {
  return {
    id: row.id,
    slug: row.slug,
    lang: row.lang === 'id' ? 'id' : 'en',
    title: row.title,
    description: row.description,
    bodyMarkdown: row.bodyMarkdown,
    coverUrl: row.coverUrl,
    tags: parseJson<string[]>(row.tagsJson, []),
    published: row.published,
    pubDate: row.pubDate,
    updatedDate: row.updatedDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getAllSections(): Promise<AllSectionsMap> {
  const defaults = getDefaultSections();
  try {
    await ensureSchema();
    const db = getDb();
    const rows = await db.select().from(siteSections);
    const result: AllSectionsMap = { ...defaults };

    for (const row of rows) {
      const key = row.key as SectionKey;
      if (!(key in sectionSchemas)) continue;
      const parsed = sectionSchemas[key].safeParse(parseJson(row.dataJson, null));
      if (parsed.success) {
        (result as unknown as Record<string, unknown>)[key] = parsed.data;
      }
    }
    return result;
  } catch {
    return defaults;
  }
}

export async function getSection<K extends SectionKey>(key: K): Promise<AllSectionsMap[K]> {
  const fallback = getDefaultSection(key);
  try {
    await ensureSchema();
    const db = getDb();
    const [row] = await db.select().from(siteSections).where(eq(siteSections.key, key));
    if (!row) return fallback as AllSectionsMap[K];
    const parsed = sectionSchemas[key].safeParse(parseJson(row.dataJson, null));
    return (parsed.success ? parsed.data : fallback) as AllSectionsMap[K];
  } catch {
    return fallback as AllSectionsMap[K];
  }
}

export async function upsertSection<K extends SectionKey>(
  key: K,
  rawData: unknown
): Promise<AllSectionsMap[K]> {
  const parsed = sectionSchemas[key].parse(rawData);
  await ensureSchema();
  const db = getDb();
  const now = Date.now();
  const dataJson = JSON.stringify(parsed);

  await db
    .insert(siteSections)
    .values({ key, dataJson, updatedAt: now })
    .onConflictDoUpdate({
      target: siteSections.key,
      set: { dataJson, updatedAt: now },
    });

  return parsed as AllSectionsMap[K];
}

export async function resetSection<K extends SectionKey>(key: K): Promise<AllSectionsMap[K]> {
  const def = getDefaultSection(key);
  return upsertSection(key, def);
}

export async function listExperiences(): Promise<ExperienceRecord[]> {
  try {
    await ensureSchema();
    const db = getDb();
    const rows = await db.select().from(experiences).orderBy(asc(experiences.sortOrder));
    if (rows.length > 0) return rows.map(mapExperience);
  } catch {
    // fall through to content collection defaults
  }

  const entries = (await getCollection('experiences')).sort((a, b) => a.data.order - b.data.order);
  return entries.map((e, i) => ({
    id: e.id,
    slug: e.id,
    company: e.data.company,
    role: e.data.role,
    type: e.data.type,
    location: e.data.location,
    period: e.data.period,
    sortOrder: i,
    project: e.data.project || '',
    summary: e.data.summary,
    stack: [...e.data.stack],
    points: [...e.data.points],
    updatedAt: 0,
  }));
}

export async function getExperienceById(id: string): Promise<ExperienceRecord | null> {
  await ensureSchema();
  const db = getDb();
  const [row] = await db.select().from(experiences).where(eq(experiences.id, id));
  return row ? mapExperience(row) : null;
}

export async function createExperience(input: {
  slug: string;
  company: string;
  role: string;
  type: string;
  location: string;
  period: string;
  sortOrder: number;
  project: string;
  summary: string;
  stack: string[];
  points: string[];
}): Promise<ExperienceRecord> {
  await ensureSchema();
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.insert(experiences).values({
    id,
    slug: input.slug,
    company: input.company,
    role: input.role,
    type: input.type,
    location: input.location,
    period: input.period,
    sortOrder: input.sortOrder,
    project: input.project,
    summary: input.summary,
    stackJson: JSON.stringify(input.stack),
    pointsJson: JSON.stringify(input.points),
    updatedAt: now,
  });

  const created = await getExperienceById(id);
  if (!created) throw new Error('Failed to create experience');
  return created;
}

export async function updateExperience(
  id: string,
  input: Omit<ExperienceRecord, 'id' | 'updatedAt'>
): Promise<ExperienceRecord | null> {
  await ensureSchema();
  const db = getDb();
  const now = Date.now();
  await db
    .update(experiences)
    .set({
      slug: input.slug,
      company: input.company,
      role: input.role,
      type: input.type,
      location: input.location,
      period: input.period,
      sortOrder: input.sortOrder,
      project: input.project,
      summary: input.summary,
      stackJson: JSON.stringify(input.stack),
      pointsJson: JSON.stringify(input.points),
      updatedAt: now,
    })
    .where(eq(experiences.id, id));

  return getExperienceById(id);
}

export async function deleteExperience(id: string): Promise<boolean> {
  await ensureSchema();
  const db = getDb();
  const res = await db.delete(experiences).where(eq(experiences.id, id));
  return (res.rowsAffected ?? 0) > 0;
}

export async function reorderExperiences(ids: string[]): Promise<void> {
  await ensureSchema();
  const db = getDb();
  const now = Date.now();
  for (let i = 0; i < ids.length; i++) {
    await db
      .update(experiences)
      .set({ sortOrder: i, updatedAt: now })
      .where(eq(experiences.id, ids[i]));
  }
}

export async function listProjects(opts: {
  featuredOnly?: boolean;
  includeDrafts?: boolean;
} = {}): Promise<ProjectRecord[]> {
  try {
    await ensureSchema();
    const db = getDb();
    const rows = await db.select().from(projects).orderBy(asc(projects.sortOrder));
    if (rows.length > 0) {
      return rows
        .map(mapProject)
        .filter((p) => (opts.includeDrafts ? true : p.published))
        .filter((p) => (opts.featuredOnly ? p.featured : true));
    }
  } catch {
    // fall through to content collection defaults
  }

  const entries = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
  return entries
    .map((p, idx) => {
      const assets = DEFAULT_PROJECT_ASSETS[p.id] ?? {
        coverUrl: p.data.cover.src,
        gallery: p.data.gallery.map((g) => g.src),
      };
      return {
        id: p.id,
        slug: p.id,
        title: p.data.title,
        year: p.data.year,
        role: p.data.role,
        category: p.data.category,
        platform: p.data.platform,
        panelLabel: p.data.panelLabel,
        summary: p.data.summary,
        coverUrl: assets.coverUrl,
        coverAlt: p.data.coverAlt,
        videoUrl: p.data.video || '',
        coverPosition: p.data.coverPosition || 'center',
        featured: p.data.featured,
        published: true,
        sortOrder: p.data.order ?? idx,
        stack: [...p.data.stack],
        metrics: p.data.metrics.map((m) => ({ ...m })),
        problem: p.data.problem,
        approach: p.data.approach,
        result: p.data.result,
        highlights: [...p.data.highlights],
        gallery: assets.gallery,
        links: p.data.links.map((l) => ({ ...l })),
        bodyMarkdown: p.body || '',
        updatedAt: 0,
      };
    })
    .filter((p) => (opts.featuredOnly ? p.featured : true));
}

export async function getProjectBySlug(
  slug: string,
  includeDrafts = false
): Promise<ProjectRecord | null> {
  const all = await listProjects({ includeDrafts });
  return all.find((p) => p.slug === slug) ?? null;
}

export async function getProjectById(id: string): Promise<ProjectRecord | null> {
  await ensureSchema();
  const db = getDb();
  const [row] = await db.select().from(projects).where(eq(projects.id, id));
  return row ? mapProject(row) : null;
}

export async function createProject(
  input: Omit<ProjectRecord, 'id' | 'updatedAt'>
): Promise<ProjectRecord> {
  await ensureSchema();
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.insert(projects).values({
    id,
    slug: input.slug,
    title: input.title,
    year: input.year,
    role: input.role,
    category: input.category,
    platform: input.platform,
    panelLabel: input.panelLabel,
    summary: input.summary,
    coverUrl: input.coverUrl,
    coverAlt: input.coverAlt,
    videoUrl: input.videoUrl,
    coverPosition: input.coverPosition,
    featured: input.featured,
    published: input.published,
    sortOrder: input.sortOrder,
    stackJson: JSON.stringify(input.stack),
    metricsJson: JSON.stringify(input.metrics),
    problem: input.problem,
    approach: input.approach,
    result: input.result,
    highlightsJson: JSON.stringify(input.highlights),
    galleryJson: JSON.stringify(input.gallery),
    linksJson: JSON.stringify(input.links),
    bodyMarkdown: input.bodyMarkdown,
    updatedAt: now,
  });

  const created = await getProjectById(id);
  if (!created) throw new Error('Failed to create project');
  return created;
}

export async function updateProject(
  id: string,
  input: Omit<ProjectRecord, 'id' | 'updatedAt'>
): Promise<ProjectRecord | null> {
  await ensureSchema();
  const db = getDb();
  const now = Date.now();
  await db
    .update(projects)
    .set({
      slug: input.slug,
      title: input.title,
      year: input.year,
      role: input.role,
      category: input.category,
      platform: input.platform,
      panelLabel: input.panelLabel,
      summary: input.summary,
      coverUrl: input.coverUrl,
      coverAlt: input.coverAlt,
      videoUrl: input.videoUrl,
      coverPosition: input.coverPosition,
      featured: input.featured,
      published: input.published,
      sortOrder: input.sortOrder,
      stackJson: JSON.stringify(input.stack),
      metricsJson: JSON.stringify(input.metrics),
      problem: input.problem,
      approach: input.approach,
      result: input.result,
      highlightsJson: JSON.stringify(input.highlights),
      galleryJson: JSON.stringify(input.gallery),
      linksJson: JSON.stringify(input.links),
      bodyMarkdown: input.bodyMarkdown,
      updatedAt: now,
    })
    .where(eq(projects.id, id));

  return getProjectById(id);
}

export async function deleteProject(id: string): Promise<boolean> {
  await ensureSchema();
  const db = getDb();
  const res = await db.delete(projects).where(eq(projects.id, id));
  return (res.rowsAffected ?? 0) > 0;
}

export async function listPosts(opts: {
  lang?: 'en' | 'id';
  includeDrafts?: boolean;
} = {}): Promise<PostRecord[]> {
  try {
    await ensureSchema();
    const db = getDb();
    const rows = await db.select().from(posts).orderBy(desc(posts.pubDate), desc(posts.createdAt));
    if (rows.length > 0) {
      return rows
        .map(mapPost)
        .filter((p) => (opts.lang ? p.lang === opts.lang : true))
        .filter((p) => (opts.includeDrafts ? true : p.published));
    }
  } catch {
    // fall through to content collection defaults
  }

  const entries = (await getCollection('posts')).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );
  return entries
    .map((p) => ({
      id: p.id,
      slug: p.id,
      lang: p.data.lang,
      title: p.data.title,
      description: p.data.description,
      bodyMarkdown: p.body || '',
      coverUrl: p.data.cover?.src || '',
      tags: [...p.data.tags],
      published: true,
      pubDate: p.data.pubDate.toISOString().slice(0, 10),
      updatedDate: p.data.updatedDate ? p.data.updatedDate.toISOString().slice(0, 10) : '',
      createdAt: p.data.pubDate.valueOf(),
      updatedAt: (p.data.updatedDate ?? p.data.pubDate).valueOf(),
    }))
    .filter((p) => (opts.lang ? p.lang === opts.lang : true));
}

export async function getPostBySlug(
  slug: string,
  opts: { lang?: 'en' | 'id'; includeDrafts?: boolean } = {}
): Promise<PostRecord | null> {
  const all = await listPosts(opts);
  return all.find((p) => p.slug === slug) ?? null;
}

export async function getPostById(id: string): Promise<PostRecord | null> {
  await ensureSchema();
  const db = getDb();
  const [row] = await db.select().from(posts).where(eq(posts.id, id));
  return row ? mapPost(row) : null;
}

export async function createPost(
  input: Omit<PostRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PostRecord> {
  await ensureSchema();
  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.insert(posts).values({
    id,
    slug: input.slug,
    lang: input.lang,
    title: input.title,
    description: input.description,
    bodyMarkdown: input.bodyMarkdown,
    coverUrl: input.coverUrl,
    tagsJson: JSON.stringify(input.tags),
    published: input.published,
    pubDate: input.pubDate,
    updatedDate: input.updatedDate,
    createdAt: now,
    updatedAt: now,
  });

  const created = await getPostById(id);
  if (!created) throw new Error('Failed to create post');
  return created;
}

export async function updatePost(
  id: string,
  input: Omit<PostRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PostRecord | null> {
  await ensureSchema();
  const db = getDb();
  const now = Date.now();
  await db
    .update(posts)
    .set({
      slug: input.slug,
      lang: input.lang,
      title: input.title,
      description: input.description,
      bodyMarkdown: input.bodyMarkdown,
      coverUrl: input.coverUrl,
      tagsJson: JSON.stringify(input.tags),
      published: input.published,
      pubDate: input.pubDate,
      updatedDate: input.updatedDate,
      updatedAt: now,
    })
    .where(eq(posts.id, id));

  return getPostById(id);
}

export async function deletePost(id: string): Promise<boolean> {
  await ensureSchema();
  const db = getDb();
  const res = await db.delete(posts).where(eq(posts.id, id));
  return (res.rowsAffected ?? 0) > 0;
}

export async function listMedia(): Promise<MediaRecord[]> {
  await ensureSchema();
  const db = getDb();
  const rows = await db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));
  return rows.map((r) => ({ ...r }));
}

export async function recordMedia(record: Omit<MediaRecord, 'createdAt'>): Promise<MediaRecord> {
  await ensureSchema();
  const db = getDb();
  const createdAt = Date.now();
  await db.insert(mediaAssets).values({ ...record, createdAt });
  return { ...record, createdAt };
}

export async function getMediaById(id: string): Promise<MediaRecord | null> {
  await ensureSchema();
  const db = getDb();
  const [row] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id));
  return row ? { ...row } : null;
}

export async function deleteMediaRecord(id: string): Promise<boolean> {
  await ensureSchema();
  const db = getDb();
  const res = await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  return (res.rowsAffected ?? 0) > 0;
}
