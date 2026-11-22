import type { APIRoute } from 'astro';
import { handleApiError, json } from '../../../../lib/cms/http';
import { createProject, listProjects } from '../../../../lib/cms/repository';
import { projectInputSchema } from '../../../../lib/cms/validators';

export const GET: APIRoute = async () => {
  try {
    const items = await listProjects({ includeDrafts: true });
    return json({ items });
  } catch (err) {
    return handleApiError(err);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const parsed = projectInputSchema.parse(body);
    const created = await createProject(parsed);
    return json({ ok: true, item: created }, 201);
  } catch (err) {
    return handleApiError(err);
  }
};
