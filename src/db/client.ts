import fs from 'node:fs';
import path from 'node:path';
import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema';

let rawClient: Client | null = null;
let dbInstance: LibSQLDatabase<typeof schema> | null = null;
let schemaReadyPromise: Promise<void> | null = null;

function resolveDbUrl(): string {
  const configured =
    process.env.TURSO_DATABASE_URL ||
    (import.meta.env?.TURSO_DATABASE_URL as string | undefined) ||
    '';

  if (configured.trim()) {
    return configured.trim();
  }

  const localDir = path.resolve(process.cwd(), '.data');
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  return `file:${path.join(localDir, 'zarvaism.db').replace(/\\/g, '/')}`;
}

export function getLibsqlClient(): Client {
  if (!rawClient) {
    const url = resolveDbUrl();
    const authToken =
      process.env.TURSO_AUTH_TOKEN ||
      (import.meta.env?.TURSO_AUTH_TOKEN as string | undefined) ||
      undefined;
    rawClient = createClient({ url, authToken });
  }
  return rawClient;
}

export function getDb(): LibSQLDatabase<typeof schema> {
  if (!dbInstance) {
    dbInstance = drizzle(getLibsqlClient(), { schema });
  }
  return dbInstance;
}

export async function ensureSchema(): Promise<void> {
  if (!schemaReadyPromise) {
    const client = getLibsqlClient();
    schemaReadyPromise = (async () => {
      await client.executeMultiple(`
        CREATE TABLE IF NOT EXISTS site_sections (
          key TEXT PRIMARY KEY NOT NULL,
          data_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS experiences (
          id TEXT PRIMARY KEY NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          company TEXT NOT NULL,
          role TEXT NOT NULL,
          type TEXT NOT NULL,
          location TEXT NOT NULL,
          period TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          project TEXT NOT NULL DEFAULT '',
          summary TEXT NOT NULL,
          stack_json TEXT NOT NULL DEFAULT '[]',
          points_json TEXT NOT NULL DEFAULT '[]',
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          year INTEGER NOT NULL,
          role TEXT NOT NULL,
          category TEXT NOT NULL,
          platform TEXT NOT NULL,
          panel_label TEXT NOT NULL DEFAULT 'case.study',
          summary TEXT NOT NULL,
          cover_url TEXT NOT NULL,
          cover_alt TEXT NOT NULL,
          video_url TEXT NOT NULL DEFAULT '',
          cover_position TEXT NOT NULL DEFAULT 'center',
          featured INTEGER NOT NULL DEFAULT 1,
          published INTEGER NOT NULL DEFAULT 1,
          sort_order INTEGER NOT NULL DEFAULT 0,
          stack_json TEXT NOT NULL DEFAULT '[]',
          metrics_json TEXT NOT NULL DEFAULT '[]',
          problem TEXT NOT NULL DEFAULT '',
          approach TEXT NOT NULL DEFAULT '',
          result TEXT NOT NULL DEFAULT '',
          highlights_json TEXT NOT NULL DEFAULT '[]',
          gallery_json TEXT NOT NULL DEFAULT '[]',
          links_json TEXT NOT NULL DEFAULT '[]',
          body_markdown TEXT NOT NULL DEFAULT '',
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS posts (
          id TEXT PRIMARY KEY NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          lang TEXT NOT NULL DEFAULT 'en',
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          body_markdown TEXT NOT NULL,
          cover_url TEXT NOT NULL DEFAULT '',
          tags_json TEXT NOT NULL DEFAULT '[]',
          published INTEGER NOT NULL DEFAULT 0,
          pub_date TEXT NOT NULL,
          updated_date TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS media_assets (
          id TEXT PRIMARY KEY NOT NULL,
          url TEXT NOT NULL,
          pathname TEXT NOT NULL,
          filename TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        );
      `);
    })();
  }
  return schemaReadyPromise;
}
