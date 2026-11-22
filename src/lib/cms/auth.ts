import crypto from 'node:crypto';
import type { APIContext, AstroCookies } from 'astro';

export const SESSION_COOKIE = 'zarva_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function readEnv(name: string): string {
  const fromProc = typeof process !== 'undefined' ? process.env[name] : undefined;
  if (fromProc && fromProc.trim()) return fromProc.trim();
  const fromVite = (import.meta.env as Record<string, string | undefined> | undefined)?.[name];
  return (fromVite || '').trim();
}

export function getAdminEmail(): string {
  return readEnv('ADMIN_EMAIL') || 'bintangfara363@gmail.com';
}

function getSessionSecret(): string {
  const secret = readEnv('CMS_SESSION_SECRET');
  if (secret.length >= 16) return secret;
  // Ephemeral fallback strictly for local dev when .env is absent
  return 'zarvaism-dev-only-secret-change-in-production';
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash?: string): boolean {
  const expected = storedHash || readEnv('ADMIN_PASSWORD_HASH');
  if (!expected) return false;

  const parts = expected.includes(':') ? expected.split(':') : expected.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hexHash] = parts;
  if (!salt || !hexHash) return false;

  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const target = Buffer.from(hexHash, 'hex');
    if (derived.length !== target.length) return false;
    return crypto.timingSafeEqual(derived, target);
  } catch {
    return false;
  }
}

interface SessionPayload {
  email: string;
  exp: number;
}

function signPayload(payloadB64: string): string {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest('base64url');
}

export function createSessionToken(email: string): string {
  const payload: SessionPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = signPayload(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;

  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payloadB64 || !sig) return null;

  const expectedSig = signPayload(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed.email || typeof parsed.exp !== 'number') return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSessionCookie(cookies: AstroCookies, request: Request, email: string): void {
  const url = new URL(request.url);
  const token = createSessionToken(email);
  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function isSameOrigin(request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

  const targetOrigin = new URL(request.url).origin;
  const origin = request.headers.get('origin');
  if (origin) return origin === targetOrigin;

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin === targetOrigin;
    } catch {
      return false;
    }
  }
  // Allow same-host programmatic requests without browser Origin/Referer only when explicit custom header is not missing, or check Sec-Fetch-Site
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return false;
  return true;
}

export function readAdminFromContext(context: Pick<APIContext, 'cookies'>): SessionPayload | null {
  const raw = context.cookies.get(SESSION_COOKIE)?.value;
  return verifySessionToken(raw);
}
