import type { APIRoute } from 'astro';
import { resolveLocalMediaFile } from '../../../lib/cms/media';

export const GET: APIRoute = async ({ params }) => {
  const file = params.file;
  if (!file) {
    return new Response('Not found', { status: 404 });
  }
  const resolved = resolveLocalMediaFile(file);
  if (!resolved) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(new Uint8Array(resolved.buffer), {
    status: 200,
    headers: {
      'Content-Type': resolved.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
