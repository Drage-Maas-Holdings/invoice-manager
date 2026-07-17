import type { APIRoute } from 'astro';
import { vendorRepository } from '../../../repositories/vendor.sqlite';
import { poRepository } from '../../../repositories/po.json';
import { invoiceRepository } from '../../../repositories/invoice.sqlite';
import { matchInvoiceToPO } from '../../../lib/matching';

export const POST: APIRoute = async (context) => {
  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const vendor_id = body.vendor_id;
  const invoice_number = body.invoice_number;
  const po_reference = body.po_reference;
  const amount = body.amount;
  const currency = body.currency;

  if (!vendor_id || !invoice_number || !po_reference || amount == null || !currency) {
    return new Response(JSON.stringify({ error: 'vendor_id, invoice_number, po_reference, amount, and currency are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return new Response(JSON.stringify({ error: 'amount must be a positive number' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const vendor = vendorRepository.findById(vendor_id as string);
  if (!vendor) {
    return new Response(JSON.stringify({ error: 'Vendor not found' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const due_date = body.due_date ? new Date(body.due_date as string) : null;
  const source_document_path = (body.source_document_path as string) ?? null;
  const supersedes_invoice_id = (body.supersedes_invoice_id as string) ?? null;

  const po = await poRepository.findByNumber(po_reference as string);
  const match_status = matchInvoiceToPO({ vendor_name: vendor.name, amount: amount as number, currency: currency as string }, po);

  try {
    const record = invoiceRepository.create({
      vendor_id: vendor_id as string,
      invoice_number: invoice_number as string,
      po_reference: po_reference as string,
      amount: amount as number,
      currency: currency as string,
      due_date,
      source_document_path,
      status: 'pending_approval',
      match_status,
      supersedes_invoice_id: supersedes_invoice_id || undefined,
    });

    return new Response(JSON.stringify(record), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Referenced invoice')) {
      return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (err instanceof Error && err.message.includes('UNIQUE constraint')) {
      return new Response(JSON.stringify({ error: 'An invoice with this number already exists for this vendor' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    throw err;
  }
};
