import type { APIRoute } from 'astro';
import { handleApiError, json } from '../../../lib/cms/http';
import { seedCmsDatabase } from '../../../lib/cms/seed';

export const POST: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const overwrite = url.searchParams.get('overwrite') === '1';
    const result = await seedCmsDatabase({ overwrite });
    return json({ ok: true, seeded: result });
  } catch (err) {
    return handleApiError(err);
  }
};
