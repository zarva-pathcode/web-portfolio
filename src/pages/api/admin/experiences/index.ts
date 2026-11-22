import type { APIRoute } from 'astro';
import { handleApiError, json } from '../../../../lib/cms/http';
import { createExperience, listExperiences } from '../../../../lib/cms/repository';
import { experienceInputSchema } from '../../../../lib/cms/validators';

export const GET: APIRoute = async () => {
  try {
    const items = await listExperiences();
    return json({ items });
  } catch (err) {
    return handleApiError(err);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const parsed = experienceInputSchema.parse(body);
    const created = await createExperience(parsed);
    return json({ ok: true, item: created }, 201);
  } catch (err) {
    return handleApiError(err);
  }
};
