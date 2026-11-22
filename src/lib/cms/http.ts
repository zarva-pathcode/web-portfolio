import { ZodError } from 'zod';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function handleApiError(err: unknown): Response {
  if (err instanceof ZodError) {
    return json(
      {
        error: 'Validasi gagal',
        issues: err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      400
    );
  }
  const msg = err instanceof Error ? err.message : 'Internal server error';
  const status = msg.toLowerCase().includes('unique') ? 409 : 400;
  return json({ error: msg }, status);
}
