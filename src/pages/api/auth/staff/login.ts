import type { APIRoute } from 'astro';
import bcrypt from 'bcrypt';
import { staffRepository } from '../../../../repositories/staff.sqlite';
import { createSessionToken, COOKIE_NAME, COOKIE_OPTIONS } from '../../../../lib/session';

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { email, password } = body;
  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Email and password are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const staff = staffRepository.findByEmail(email.toLowerCase());
  if (!staff) {
    return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const valid = await bcrypt.compare(password, staff.password_hash);
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const token = createSessionToken({ actor_type: 'staff', staff_id: staff.id });
  cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
