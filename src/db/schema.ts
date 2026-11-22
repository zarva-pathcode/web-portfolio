import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const siteSections = sqliteTable('site_sections', {
  key: text('key').primaryKey(),
  dataJson: text('data_json').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const experiences = sqliteTable('experiences', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  company: text('company').notNull(),
  role: text('role').notNull(),
  type: text('type').notNull(),
  location: text('location').notNull(),
  period: text('period').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  project: text('project').notNull().default(''),
  summary: text('summary').notNull(),
  stackJson: text('stack_json').notNull().default('[]'),
  pointsJson: text('points_json').notNull().default('[]'),
  updatedAt: integer('updated_at').notNull(),
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  year: integer('year').notNull(),
  role: text('role').notNull(),
  category: text('category').notNull(),
  platform: text('platform').notNull(),
  panelLabel: text('panel_label').notNull().default('case.study'),
  summary: text('summary').notNull(),
  coverUrl: text('cover_url').notNull(),
  coverAlt: text('cover_alt').notNull(),
  videoUrl: text('video_url').notNull().default(''),
  coverPosition: text('cover_position').notNull().default('center'),
  featured: integer('featured', { mode: 'boolean' }).notNull().default(true),
  published: integer('published', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  stackJson: text('stack_json').notNull().default('[]'),
  metricsJson: text('metrics_json').notNull().default('[]'),
  problem: text('problem').notNull().default(''),
  approach: text('approach').notNull().default(''),
  result: text('result').notNull().default(''),
  highlightsJson: text('highlights_json').notNull().default('[]'),
  galleryJson: text('gallery_json').notNull().default('[]'),
  linksJson: text('links_json').notNull().default('[]'),
  bodyMarkdown: text('body_markdown').notNull().default(''),
  updatedAt: integer('updated_at').notNull(),
});

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  lang: text('lang').notNull().default('en'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  bodyMarkdown: text('body_markdown').notNull(),
  coverUrl: text('cover_url').notNull().default(''),
  tagsJson: text('tags_json').notNull().default('[]'),
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  pubDate: text('pub_date').notNull(),
  updatedDate: text('updated_date').notNull().default(''),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const mediaAssets = sqliteTable('media_assets', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  pathname: text('pathname').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: integer('created_at').notNull(),
});
