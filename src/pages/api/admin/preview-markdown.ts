import type { APIRoute } from 'astro';
import { handleApiError, json } from '../../../lib/cms/http';
import { renderMarkdownSafe } from '../../../lib/cms/markdown';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as { markdown?: string };
    const html = renderMarkdownSafe(typeof body.markdown === 'string' ? body.markdown : '');
    return json({ html });
  } catch (err) {
    return handleApiError(err);
  }
};
