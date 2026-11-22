import type { APIRoute } from 'astro';
import { handleApiError, json } from '../../../../lib/cms/http';
import { deleteStoredMedia } from '../../../../lib/cms/media';
import { deleteMediaRecord, getMediaById } from '../../../../lib/cms/repository';

export const DELETE: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) return json({ error: 'Missing id' }, 400);
  try {
    const item = await getMediaById(id);
    if (!item) return json({ error: 'Media tidak ditemukan' }, 404);
    await deleteStoredMedia(item.url, item.pathname);
    await deleteMediaRecord(id);
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
};
