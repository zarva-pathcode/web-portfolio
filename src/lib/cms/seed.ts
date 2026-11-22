import fs from 'node:fs';
import path from 'node:path';
import { getDefaultSections } from './defaults';
import { ensureSchema, getDb } from '../../db/client';
import { experiences, posts, projects, siteSections } from '../../db/schema';

const PROJECT_ASSET_MAP: Record<string, { coverUrl: string; gallery: string[] }> = {
  coacivo: { coverUrl: '/images/projects/coacivo-cover.png', gallery: [] },
  'rektor-cup': { coverUrl: '/images/projects/rektor-cup-cover.png', gallery: [] },
  artiva: {
    coverUrl: '/images/projects/artiva-cover.png',
    gallery: ['/images/projects/artiva-gallery-1.png'],
  },
};

function unquote(val: string): string {
  const s = val.trim();
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1).replace(/''/g, "'");
  }
  return s;
}

function parseFlowObject(raw: string): Record<string, string> {
  const inner = raw.trim().replace(/^\{/, '').replace(/\}$/, '');
  const out: Record<string, string> = {};
  for (const part of inner.split(',')) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = unquote(part.slice(idx + 1));
    out[k] = v;
  }
  return out;
}

function parseFrontmatterDoc(raw: string): { data: Record<string, unknown>; body: string } {
  const normalized = raw.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: normalized.trim() };

  const lines = match[1].split('\n');
  const data: Record<string, unknown> = {};
  let currentKey = '';
  let foldMode = false;
  let foldLines: string[] = [];

  const flushFold = () => {
    if (foldMode && currentKey) {
      data[currentKey] = foldLines.join(' ').trim();
      foldMode = false;
      foldLines = [];
    }
  };

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) {
      if (foldMode && !line.trim()) foldLines.push('');
      continue;
    }

    if (foldMode) {
      if (/^\s+/.test(line)) {
        foldLines.push(line.trim());
        continue;
      }
      flushFold();
    }

    const itemMatch = line.match(/^\s+-\s+(.*)$/);
    if (itemMatch && currentKey) {
      const arr = (Array.isArray(data[currentKey]) ? data[currentKey] : []) as unknown[];
      const itemRaw = itemMatch[1].trim();
      if (itemRaw.startsWith('{') && itemRaw.endsWith('}')) {
        arr.push(parseFlowObject(itemRaw));
      } else {
        arr.push(unquote(itemRaw));
      }
      data[currentKey] = arr;
      continue;
    }

    const kvMatch = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!kvMatch) continue;

    currentKey = kvMatch[1];
    const rawVal = kvMatch[2].trim();
    if (rawVal === '>-' || rawVal === '|') {
      foldMode = true;
      foldLines = [];
    } else if (rawVal === '[]') {
      data[currentKey] = [];
    } else if (rawVal === 'true') {
      data[currentKey] = true;
    } else if (rawVal === 'false') {
      data[currentKey] = false;
    } else if (/^\d+$/.test(rawVal)) {
      data[currentKey] = Number(rawVal);
    } else if (rawVal === '') {
      data[currentKey] = [];
    } else {
      data[currentKey] = unquote(rawVal);
    }
  }
  flushFold();

  return { data, body: match[2].trim() };
}

function listMdFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...listMdFiles(full));
    else if (entry.name.endsWith('.md')) results.push(full);
  }
  return results;
}

export async function seedCmsDatabase(options: { overwrite?: boolean } = {}): Promise<{
  sections: number;
  experiences: number;
  projects: number;
  posts: number;
}> {
  await ensureSchema();
  const db = getDb();
  const now = Date.now();
  const root = process.cwd();
  const overwrite = Boolean(options.overwrite);

  // 1. Seed 7 site_sections
  const sections = getDefaultSections();
  let sectionCount = 0;
  for (const [key, value] of Object.entries(sections)) {
    const payload = { key, dataJson: JSON.stringify(value), updatedAt: now };
    if (overwrite) {
      await db
        .insert(siteSections)
        .values(payload)
        .onConflictDoUpdate({
          target: siteSections.key,
          set: { dataJson: payload.dataJson, updatedAt: now },
        });
    } else {
      await db.insert(siteSections).values(payload).onConflictDoNothing();
    }
    sectionCount++;
  }

  // 2. Seed experiences from src/content/experiences/*.md
  const expFiles = listMdFiles(path.join(root, 'src', 'content', 'experiences')).sort();
  let expCount = 0;
  for (let i = 0; i < expFiles.length; i++) {
    const file = expFiles[i];
    const slug = path.basename(file, '.md');
    const { data } = parseFrontmatterDoc(fs.readFileSync(file, 'utf8'));
    const orderVal = typeof data.order === 'number' ? data.order - 1 : i;
    const row = {
      id: `seed-exp-${slug}`,
      slug,
      company: String(data.company || ''),
      role: String(data.role || ''),
      type: String(data.type || ''),
      location: String(data.location || ''),
      period: String(data.period || ''),
      sortOrder: Math.max(0, orderVal),
      project: String(data.project || ''),
      summary: String(data.summary || ''),
      stackJson: JSON.stringify(Array.isArray(data.stack) ? data.stack : []),
      pointsJson: JSON.stringify(Array.isArray(data.points) ? data.points : []),
      updatedAt: now,
    };

    if (overwrite) {
      await db
        .insert(experiences)
        .values(row)
        .onConflictDoUpdate({ target: experiences.slug, set: { ...row, id: undefined } });
    } else {
      await db.insert(experiences).values(row).onConflictDoNothing({ target: experiences.slug });
    }
    expCount++;
  }

  // 3. Seed projects from src/content/projects/*.md
  const projFiles = listMdFiles(path.join(root, 'src', 'content', 'projects')).sort();
  let projCount = 0;
  for (let i = 0; i < projFiles.length; i++) {
    const file = projFiles[i];
    const slug = path.basename(file, '.md');
    const { data, body } = parseFrontmatterDoc(fs.readFileSync(file, 'utf8'));
    const assets = PROJECT_ASSET_MAP[slug] ?? { coverUrl: '/images/projects/artiva-cover.png', gallery: [] };
    const row = {
      id: `seed-proj-${slug}`,
      slug,
      title: String(data.title || slug),
      year: Number(data.year || 2025),
      role: String(data.role || ''),
      category: String(data.category || ''),
      platform: String(data.platform || ''),
      panelLabel: String(data.panelLabel || `${slug}.case`),
      summary: String(data.summary || ''),
      coverUrl: assets.coverUrl,
      coverAlt: String(data.coverAlt || String(data.title || slug)),
      videoUrl: String(data.video || ''),
      coverPosition: String(data.coverPosition || 'center'),
      featured: Boolean(data.featured ?? true),
      published: true,
      sortOrder: typeof data.order === 'number' ? data.order - 1 : i,
      stackJson: JSON.stringify(Array.isArray(data.stack) ? data.stack : []),
      metricsJson: JSON.stringify(Array.isArray(data.metrics) ? data.metrics : []),
      problem: String(data.problem || ''),
      approach: String(data.approach || ''),
      result: String(data.result || ''),
      highlightsJson: JSON.stringify(Array.isArray(data.highlights) ? data.highlights : []),
      galleryJson: JSON.stringify(assets.gallery),
      linksJson: JSON.stringify(Array.isArray(data.links) ? data.links : []),
      bodyMarkdown: body,
      updatedAt: now,
    };

    if (overwrite) {
      await db
        .insert(projects)
        .values(row)
        .onConflictDoUpdate({ target: projects.slug, set: { ...row, id: undefined } });
    } else {
      await db.insert(projects).values(row).onConflictDoNothing({ target: projects.slug });
    }
    projCount++;
  }

  // 4. Seed blog posts from src/content/blog/**/*.md
  const postFiles = listMdFiles(path.join(root, 'src', 'content', 'blog')).sort();
  let postCount = 0;
  for (const file of postFiles) {
    const slug = path.basename(file, '.md');
    const { data, body } = parseFrontmatterDoc(fs.readFileSync(file, 'utf8'));
    const lang = data.lang === 'id' ? 'id' : 'en';
    const row = {
      id: `seed-post-${slug}`,
      slug,
      lang,
      title: String(data.title || slug),
      description: String(data.description || ''),
      bodyMarkdown: body,
      coverUrl: '',
      tagsJson: JSON.stringify(Array.isArray(data.tags) ? data.tags : []),
      published: true,
      pubDate: String(data.pubDate || '2026-09-29').slice(0, 10),
      updatedDate: data.updatedDate ? String(data.updatedDate).slice(0, 10) : '',
      createdAt: now,
      updatedAt: now,
    };

    if (overwrite) {
      await db
        .insert(posts)
        .values(row)
        .onConflictDoUpdate({ target: posts.slug, set: { ...row, id: undefined } });
    } else {
      await db.insert(posts).values(row).onConflictDoNothing({ target: posts.slug });
    }
    postCount++;
  }

  return {
    sections: sectionCount,
    experiences: expCount,
    projects: projCount,
    posts: postCount,
  };
}
