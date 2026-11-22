import type { APIRoute } from 'astro';
import { handleApiError, json } from '../../../../lib/cms/http';
import { getSection, resetSection, upsertSection } from '../../../../lib/cms/repository';
import { sectionSchemas, type SectionKey } from '../../../../lib/cms/validators';

function parseKey(raw: string | undefined): SectionKey | null {
  if (!raw || !(raw in sectionSchemas)) return null;
  return raw as SectionKey;
}

export const GET: APIRoute = async ({ params }) => {
  const key = parseKey(params.key);
  if (!key) return json({ error: 'Unknown section key' }, 404);
  try {
    const data = await getSection(key);
    return json({ key, data });
  } catch (err) {
    return handleApiError(err);
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  const key = parseKey(params.key);
  if (!key) return json({ error: 'Unknown section key' }, 404);
  try {
    const body = await request.json();
    const saved = await upsertSection(key, body);
    return json({ ok: true, key, data: saved });
  } catch (err) {
    return handleApiError(err);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  const key = parseKey(params.key);
  if (!key) return json({ error: 'Unknown section key' }, 404);
  try {
    const data = await resetSection(key);
    return json({ ok: true, key, data });
  } catch (err) {
    return handleApiError(err);
  }
};
