import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getAdminEmail, setSessionCookie, verifyPassword } from '../../../lib/cms/auth';
import { handleApiError, json } from '../../../lib/cms/http';

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const expectedEmail = getAdminEmail().toLowerCase();
    const emailMatch = email.toLowerCase() === expectedEmail;
    const passMatch = verifyPassword(password);

    if (!emailMatch || !passMatch) {
      return json({ error: 'Email atau password salah.' }, 401);
    }

    setSessionCookie(cookies, request, expectedEmail);
    return json({ ok: true, email: expectedEmail });
  } catch (err) {
    return handleApiError(err);
  }
};
