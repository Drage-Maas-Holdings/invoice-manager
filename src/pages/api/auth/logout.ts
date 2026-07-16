import type { APIRoute } from 'astro';
import { COOKIE_NAME, COOKIE_OPTIONS } from '../../../lib/session';

export const POST: APIRoute = async ({ cookies }) => {
  cookies.set(COOKIE_NAME, '', { ...COOKIE_OPTIONS, maxAge: 0 });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
