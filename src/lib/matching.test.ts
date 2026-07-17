import { describe, it, expect } from 'vitest';
import { matchInvoiceToPO } from './matching';

const po = { po_number: 'PO-001', vendor_name: 'Acme Corp', total_amount: 1000.00, currency: 'USD' };

describe('matchInvoiceToPO', () => {
  it('returns matched when all fields match', () => {
    expect(matchInvoiceToPO({ vendor_name: 'Acme Corp', amount: 1000.00, currency: 'USD' }, po)).toBe('matched');
  });

  it('returns unmatched when no PO found', () => {
    expect(matchInvoiceToPO({ vendor_name: 'Acme Corp', amount: 1000.00, currency: 'USD' }, null)).toBe('unmatched');
  });

  it('returns unmatched on vendor name mismatch', () => {
    expect(matchInvoiceToPO({ vendor_name: 'Different Inc', amount: 1000.00, currency: 'USD' }, po)).toBe('unmatched');
  });

  it('returns unmatched on amount beyond tolerance', () => {
    expect(matchInvoiceToPO({ vendor_name: 'Acme Corp', amount: 1001.00, currency: 'USD' }, po)).toBe('unmatched');
  });

  it('returns unmatched on currency mismatch', () => {
    expect(matchInvoiceToPO({ vendor_name: 'Acme Corp', amount: 1000.00, currency: 'EUR' }, po)).toBe('unmatched');
  });

  it('matches at the tolerance boundary (0.01)', () => {
    expect(matchInvoiceToPO({ vendor_name: 'Acme Corp', amount: 1000.01, currency: 'USD' }, po)).toBe('matched');
    expect(matchInvoiceToPO({ vendor_name: 'Acme Corp', amount: 999.99, currency: 'USD' }, po)).toBe('matched');
  });

  it('matches case-insensitive vendor name', () => {
    expect(matchInvoiceToPO({ vendor_name: 'acme corp', amount: 1000.00, currency: 'USD' }, po)).toBe('matched');
    expect(matchInvoiceToPO({ vendor_name: 'ACME CORP', amount: 1000.00, currency: 'USD' }, po)).toBe('matched');
  });

  it('matches case-insensitive currency', () => {
    expect(matchInvoiceToPO({ vendor_name: 'Acme Corp', amount: 1000.00, currency: 'usd' }, po)).toBe('matched');
    expect(matchInvoiceToPO({ vendor_name: 'Acme Corp', amount: 1000.00, currency: 'Usd' }, po)).toBe('matched');
  });
});
