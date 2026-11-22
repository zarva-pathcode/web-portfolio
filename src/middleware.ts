import { defineMiddleware } from 'astro:middleware';
import { isSameOrigin, readAdminFromContext } from './lib/cms/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const session = readAdminFromContext(context);

  context.locals.isAdmin = Boolean(session);
  context.locals.adminEmail = session?.email ?? null;

  // CSRF origin guard for all mutating API calls
  if (pathname.startsWith('/api/') && !isSameOrigin(context.request)) {
    return new Response(JSON.stringify({ error: 'Invalid origin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Protect admin API routes (except login/logout)
  if (
    pathname.startsWith('/api/admin/') &&
    pathname !== '/api/admin/login' &&
    pathname !== '/api/admin/logout'
  ) {
    if (!context.locals.isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Protect admin UI routes (except /admin/login)
  if (
    (pathname === '/admin' || pathname.startsWith('/admin/')) &&
    pathname !== '/admin/login'
  ) {
    if (!context.locals.isAdmin) {
      return context.redirect('/admin/login', 302);
    }
  }

  const response = await next();

  // Never allow caching on admin pages or admin API responses
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, private');
  }

  return response;
});
