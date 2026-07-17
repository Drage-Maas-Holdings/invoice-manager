import type { APIRoute } from 'astro';
import { invoiceRepository } from '../../../repositories/invoice.sqlite';
import { bucketOutstandingLiabilities } from '../../../lib/invoice-reporting';

export const GET: APIRoute = async () => {
  const invoices = invoiceRepository.list();
  const buckets = bucketOutstandingLiabilities(invoices, new Date());
  return new Response(JSON.stringify(buckets), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
