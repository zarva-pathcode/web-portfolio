import type { APIRoute } from 'astro';
import { clearSessionCookie } from '../../../lib/cms/auth';
import { json } from '../../../lib/cms/http';

export const POST: APIRoute = async ({ cookies }) => {
  clearSessionCookie(cookies);
  return json({ ok: true });
};
