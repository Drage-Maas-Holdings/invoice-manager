import { db } from '../db/client';
import { invoice } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { InvoiceRecord, InvoiceRepository, InvoiceStatus } from './invoice';

function rowToRecord(row: typeof invoice.$inferSelect): InvoiceRecord {
  return {
    id: row.id,
    vendor_id: row.vendor_id,
    invoice_number: row.invoice_number,
    po_reference: row.po_reference,
    amount: row.amount,
    currency: row.currency,
    due_date: row.due_date,
    source_document_path: row.source_document_path,
    status: row.status as InvoiceStatus,
    match_status: row.match_status as InvoiceRecord['match_status'],
    supersedes_invoice_id: row.supersedes_invoice_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const invoiceRepository: InvoiceRepository = {
  create(data) {
    if (data.supersedes_invoice_id) {
      const referenced = db.select().from(invoice).where(eq(invoice.id, data.supersedes_invoice_id)).get();
      if (!referenced) {
        throw new Error(`Referenced invoice ${data.supersedes_invoice_id} does not exist`);
      }
    }

    const id = data.id ?? randomUUID();
    const now = new Date();
    db.insert(invoice).values({
      id,
      vendor_id: data.vendor_id,
      invoice_number: data.invoice_number,
      po_reference: data.po_reference,
      amount: data.amount,
      currency: data.currency,
      due_date: data.due_date ?? null,
      source_document_path: data.source_document_path ?? null,
      status: data.status,
      match_status: data.match_status,
      supersedes_invoice_id: data.supersedes_invoice_id ?? null,
      created_at: now,
      updated_at: now,
    }).run();
    return {
      id,
      vendor_id: data.vendor_id,
      invoice_number: data.invoice_number,
      po_reference: data.po_reference,
      amount: data.amount,
      currency: data.currency,
      due_date: data.due_date ?? null,
      source_document_path: data.source_document_path ?? null,
      status: data.status,
      match_status: data.match_status,
      supersedes_invoice_id: data.supersedes_invoice_id ?? null,
      created_at: now,
      updated_at: now,
    };
  },

  findById(id) {
    const row = db.select().from(invoice).where(eq(invoice.id, id)).get();
    return row ? rowToRecord(row) : null;
  },

  findByVendor(vendorId) {
    return db.select().from(invoice).where(eq(invoice.vendor_id, vendorId)).orderBy(desc(invoice.created_at)).all().map(rowToRecord);
  },

  updateStatus(id, status) {
    const now = new Date();
    db.update(invoice).set({ status, updated_at: now }).where(eq(invoice.id, id)).run();
    const row = db.select().from(invoice).where(eq(invoice.id, id)).get();
    if (!row) throw new Error(`Invoice ${id} not found`);
    return rowToRecord(row);
  },

  list() {
    return db.select().from(invoice).orderBy(desc(invoice.created_at)).all().map(rowToRecord);
  },
};
