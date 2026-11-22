import type { APIRoute } from 'astro';
import { handleApiError, json } from '../../../../lib/cms/http';
import { createPost, listPosts } from '../../../../lib/cms/repository';
import { postInputSchema } from '../../../../lib/cms/validators';

export const GET: APIRoute = async () => {
  try {
    const items = await listPosts({ includeDrafts: true });
    return json({ items });
  } catch (err) {
    return handleApiError(err);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const parsed = postInputSchema.parse(body);
    const created = await createPost(parsed);
    return json({ ok: true, item: created }, 201);
  } catch (err) {
    return handleApiError(err);
  }
};
