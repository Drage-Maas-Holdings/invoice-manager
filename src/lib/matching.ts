import type { PurchaseOrder } from '../repositories/po';

export function matchInvoiceToPO(
  invoiceFields: { vendor_name: string; amount: number; currency: string },
  po: PurchaseOrder | null,
): 'matched' | 'unmatched' {
  if (!po) return 'unmatched';

  if (invoiceFields.vendor_name.toLowerCase() !== po.vendor_name.toLowerCase()) {
    return 'unmatched';
  }

  if (Math.abs(invoiceFields.amount - po.total_amount) > 0.01) {
    return 'unmatched';
  }

  if (invoiceFields.currency.toLowerCase() !== po.currency.toLowerCase()) {
    return 'unmatched';
  }

  return 'matched';
}
