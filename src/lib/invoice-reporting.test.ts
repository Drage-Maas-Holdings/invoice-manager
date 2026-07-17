import { describe, it, expect } from 'vitest';
import { bucketOutstandingLiabilities } from './invoice-reporting';
import type { InvoiceRecord } from '../repositories/invoice';

const now = new Date('2026-07-17T12:00:00Z');

function make(overrides: Partial<InvoiceRecord>): InvoiceRecord {
  return {
    id: 'inv-1',
    vendor_id: 'v-1',
    invoice_number: 'INV-001',
    po_reference: 'PO-001',
    amount: 100,
    currency: 'USD',
    due_date: null,
    source_document_path: null,
    status: 'submitted',
    match_status: 'unmatched',
    supersedes_invoice_id: null,
    created_at: new Date('2026-07-01'),
    updated_at: new Date('2026-07-01'),
    ...overrides,
  };
}

describe('bucketOutstandingLiabilities', () => {
  it('assigns overdue invoices to the overdue bucket', () => {
    const inv = make({ due_date: new Date('2026-07-16'), amount: 200 });
    const result = bucketOutstandingLiabilities([inv], now);
    expect(result.overdue).toEqual({ total: 200, count: 1 });
    expect(result.this_week.total).toBe(0);
    expect(result.this_month.total).toBe(0);
    expect(result.later.total).toBe(0);
    expect(result.undated.total).toBe(0);
  });

  it('assigns today invoices to this_week', () => {
    const inv = make({ due_date: new Date('2026-07-17'), amount: 150 });
    const result = bucketOutstandingLiabilities([inv], now);
    expect(result.this_week).toEqual({ total: 150, count: 1 });
    expect(result.overdue.total).toBe(0);
  });

  it('assigns end-of-week invoices to this_week', () => {
    const inv = make({ due_date: new Date('2026-07-19'), amount: 75 });
    const result = bucketOutstandingLiabilities([inv], now);
    expect(result.this_week).toEqual({ total: 75, count: 1 });
    expect(result.overdue.total).toBe(0);
    expect(result.this_month.total).toBe(0);
  });

  it('assigns post-week but within-month invoices to this_month', () => {
    const inv = make({ due_date: new Date('2026-07-25'), amount: 300 });
    const result = bucketOutstandingLiabilities([inv], now);
    expect(result.this_month).toEqual({ total: 300, count: 1 });
    expect(result.this_week.total).toBe(0);
    expect(result.later.total).toBe(0);
  });

  it('assigns end-of-month invoices to this_month', () => {
    const inv = make({ due_date: new Date('2026-07-31'), amount: 500 });
    const result = bucketOutstandingLiabilities([inv], now);
    expect(result.this_month).toEqual({ total: 500, count: 1 });
    expect(result.later.total).toBe(0);
  });

  it('assigns beyond-month invoices to later', () => {
    const inv = make({ due_date: new Date('2026-08-15'), amount: 1000 });
    const result = bucketOutstandingLiabilities([inv], now);
    expect(result.later).toEqual({ total: 1000, count: 1 });
    expect(result.this_month.total).toBe(0);
  });

  it('assigns null due_date to undated', () => {
    const inv = make({ due_date: null, amount: 250 });
    const result = bucketOutstandingLiabilities([inv], now);
    expect(result.undated).toEqual({ total: 250, count: 1 });
    expect(result.overdue.total).toBe(0);
    expect(result.this_week.total).toBe(0);
    expect(result.this_month.total).toBe(0);
    expect(result.later.total).toBe(0);
  });

  it('excludes reconciled invoices', () => {
    const inv = make({ status: 'reconciled', amount: 999 });
    const result = bucketOutstandingLiabilities([inv], now);
    expect(result.overdue.total).toBe(0);
    expect(result.undated.total).toBe(0);
  });

  it('excludes rejected invoices', () => {
    const inv = make({ status: 'rejected', amount: 999 });
    const result = bucketOutstandingLiabilities([inv], now);
    expect(result.overdue.total).toBe(0);
    expect(result.undated.total).toBe(0);
  });

  it('includes non-terminal statuses', () => {
    const inv = make({ status: 'pending_approval', due_date: new Date('2026-07-16'), amount: 100 });
    const result = bucketOutstandingLiabilities([inv], now);
    expect(result.overdue).toEqual({ total: 100, count: 1 });
  });

  it('accumulates multiple invoices in the same bucket', () => {
    const result = bucketOutstandingLiabilities([
      make({ due_date: new Date('2026-07-16'), amount: 100 }),
      make({ id: 'inv-2', due_date: new Date('2026-07-15'), amount: 50 }),
    ], now);
    expect(result.overdue).toEqual({ total: 150, count: 2 });
  });

  it('accumulates multiple invoices in different buckets', () => {
    const result = bucketOutstandingLiabilities([
      make({ id: 'inv-1', due_date: new Date('2026-07-16'), amount: 100 }),
      make({ id: 'inv-2', due_date: new Date('2026-07-18'), amount: 200 }),
      make({ id: 'inv-3', due_date: null, amount: 300 }),
      make({ id: 'inv-4', due_date: new Date('2026-08-01'), amount: 400 }),
      make({ id: 'inv-5', due_date: new Date('2026-07-25'), amount: 500 }),
    ], now);
    expect(result.overdue).toEqual({ total: 100, count: 1 });
    expect(result.this_week).toEqual({ total: 200, count: 1 });
    expect(result.this_month).toEqual({ total: 500, count: 1 });
    expect(result.later).toEqual({ total: 400, count: 1 });
    expect(result.undated).toEqual({ total: 300, count: 1 });
  });
});
