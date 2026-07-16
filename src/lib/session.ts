import { createHmac, timingSafeEqual } from 'node:crypto';

const SESSION_SECRET = import.meta.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be set and at least 32 characters');
}

export const COOKIE_NAME = 'session';
export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: import.meta.env.PROD,
};

type StaffPayload = { actor_type: 'staff'; staff_id: string; exp: number };
type VendorPayload = { actor_type: 'vendor'; vendor_id: string; exp: number };
export type SessionPayload = StaffPayload | VendorPayload;

function hmac(data: string): string {
  return createHmac('sha256', SESSION_SECRET!)
    .update(data)
    .digest('base64url');
}

export function createSessionToken(payload: Omit<SessionPayload, 'exp'>): string {
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const full: SessionPayload = { ...payload, exp } as SessionPayload;
  const data = base64url(JSON.stringify(full));
  const sig = hmac(data);
  return `${data}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;

  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expectedSig = hmac(data);
  if (sig.length !== expectedSig.length) return null;

  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  } catch {
    return null;
  }

  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function base64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}
