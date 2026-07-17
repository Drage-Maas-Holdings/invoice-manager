import type { APIRoute } from 'astro';
import bcrypt from 'bcrypt';
import { vendorRepository } from '../../../../repositories/vendor.sqlite';
import { createSessionToken, COOKIE_NAME, COOKIE_OPTIONS } from '../../../../lib/session';

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { name?: string; passcode?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { name, passcode } = body;
  if (!name || !passcode) {
    return new Response(JSON.stringify({ error: 'Name and passcode are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const vendor = vendorRepository.findByName(name.trim());
  if (!vendor) {
    return new Response(JSON.stringify({ error: 'Invalid vendor name or passcode' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const valid = await bcrypt.compare(passcode, vendor.passcode_hash);
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid vendor name or passcode' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const token = createSessionToken({ actor_type: 'vendor', vendor_id: vendor.id });
  cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
