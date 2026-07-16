import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const { actor } = context.locals;
  return new Response(JSON.stringify({ ok: true, staff_id: (actor as { staff_id: string }).staff_id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
