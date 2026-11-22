import type { APIRoute } from 'astro';
import { handleApiError, json } from '../../../../lib/cms/http';
import { deletePost, getPostById, updatePost } from '../../../../lib/cms/repository';
import { postInputSchema } from '../../../../lib/cms/validators';

export const GET: APIRoute = async ({ params }) => {
  if (!params.id) return json({ error: 'Missing id' }, 400);
  try {
    const item = await getPostById(params.id);
    if (!item) return json({ error: 'Post not found' }, 404);
    return json({ item });
  } catch (err) {
    return handleApiError(err);
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  if (!params.id) return json({ error: 'Missing id' }, 400);
  try {
    const body = await request.json();
    const parsed = postInputSchema.parse(body);
    const updated = await updatePost(params.id, parsed);
    if (!updated) return json({ error: 'Post not found' }, 404);
    return json({ ok: true, item: updated });
  } catch (err) {
    return handleApiError(err);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  if (!params.id) return json({ error: 'Missing id' }, 400);
  try {
    const ok = await deletePost(params.id);
    if (!ok) return json({ error: 'Post not found' }, 404);
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
};
