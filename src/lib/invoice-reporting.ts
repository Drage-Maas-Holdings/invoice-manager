import type { InvoiceRecord } from '../repositories/invoice';

export type BucketKey = 'overdue' | 'this_week' | 'this_month' | 'later' | 'undated';

export interface BucketTotals {
  total: number;
  count: number;
}

export type OutstandingLiabilities = Record<BucketKey, BucketTotals>;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 59, 999);
  return d;
}

function endOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function bucketOutstandingLiabilities(
  invoices: InvoiceRecord[],
  now: Date,
): OutstandingLiabilities {
  const buckets: OutstandingLiabilities = {
    overdue: { total: 0, count: 0 },
    this_week: { total: 0, count: 0 },
    this_month: { total: 0, count: 0 },
    later: { total: 0, count: 0 },
    undated: { total: 0, count: 0 },
  };

  const today = startOfDay(now);
  const weekEnd = endOfWeek(now);
  const monthEnd = endOfMonth(now);

  for (const inv of invoices) {
    if (inv.status === 'reconciled' || inv.status === 'rejected') continue;

    const key: BucketKey = inv.due_date === null
      ? 'undated'
      : inv.due_date < today
        ? 'overdue'
        : inv.due_date <= weekEnd
          ? 'this_week'
          : inv.due_date <= monthEnd
            ? 'this_month'
            : 'later';

    buckets[key].total += inv.amount;
    buckets[key].count += 1;
  }

  return buckets;
}
