import type { APIRoute } from 'astro';
import { handleApiError, json } from '../../../../lib/cms/http';
import { reorderExperiences } from '../../../../lib/cms/repository';
import { experienceReorderSchema } from '../../../../lib/cms/validators';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { ids } = experienceReorderSchema.parse(body);
    await reorderExperiences(ids);
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
};
