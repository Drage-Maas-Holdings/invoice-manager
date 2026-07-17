import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const { actor } = context.locals;
  return new Response(JSON.stringify({ ok: true, vendor_id: (actor as { vendor_id: string }).vendor_id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
