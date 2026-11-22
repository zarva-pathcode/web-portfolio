import type { APIRoute } from 'astro';
import { handleApiError, json } from '../../../../lib/cms/http';
import { deleteProject, getProjectById, updateProject } from '../../../../lib/cms/repository';
import { projectInputSchema } from '../../../../lib/cms/validators';

export const GET: APIRoute = async ({ params }) => {
  if (!params.id) return json({ error: 'Missing id' }, 400);
  try {
    const item = await getProjectById(params.id);
    if (!item) return json({ error: 'Project not found' }, 404);
    return json({ item });
  } catch (err) {
    return handleApiError(err);
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  if (!params.id) return json({ error: 'Missing id' }, 400);
  try {
    const body = await request.json();
    const parsed = projectInputSchema.parse(body);
    const updated = await updateProject(params.id, parsed);
    if (!updated) return json({ error: 'Project not found' }, 404);
    return json({ ok: true, item: updated });
  } catch (err) {
    return handleApiError(err);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  if (!params.id) return json({ error: 'Missing id' }, 400);
  try {
    const ok = await deleteProject(params.id);
    if (!ok) return json({ error: 'Project not found' }, 404);
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
};
