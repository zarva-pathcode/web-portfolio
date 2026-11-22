import type { APIRoute } from 'astro';
import { handleApiError, json } from '../../../../lib/cms/http';
import { uploadMediaFile } from '../../../../lib/cms/media';
import { listMedia, recordMedia } from '../../../../lib/cms/repository';

export const GET: APIRoute = async () => {
  try {
    const items = await listMedia();
    return json({ items });
  } catch (err) {
    return handleApiError(err);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return json({ error: 'Field "file" wajib diisi.' }, 400);
    }

    const uploaded = await uploadMediaFile(file);
    const saved = await recordMedia(uploaded);
    return json({ ok: true, item: saved }, 201);
  } catch (err) {
    return handleApiError(err);
  }
};
