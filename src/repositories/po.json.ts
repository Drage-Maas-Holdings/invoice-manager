import { readFileSync, existsSync } from 'node:fs';
import type { PurchaseOrder, PORepository } from './po';

const REQUIRED_FIELDS: (keyof PurchaseOrder)[] = ['po_number', 'vendor_name', 'total_amount', 'currency'];

function loadAll(): PurchaseOrder[] {
  const path = process.env.PO_DATA_PATH ?? 'data/purchase-orders.json';

  if (!existsSync(path)) {
    throw new Error(`PO data file not found: ${path}`);
  }

  let raw: unknown[];
  try {
    const content = readFileSync(path, 'utf-8');
    raw = JSON.parse(content);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`PO data file contains invalid JSON: ${path}`);
    }
    throw err;
  }

  if (!Array.isArray(raw)) {
    throw new Error(`PO data file must contain a JSON array: ${path}`);
  }

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`PO data file contains invalid entry: ${JSON.stringify(entry)}`);
    }
    for (const field of REQUIRED_FIELDS) {
      if (!(field in (entry as Record<string, unknown>))) {
        throw new Error(`PO entry missing required field "${field}": ${JSON.stringify(entry)}`);
      }
    }
  }

  return raw as PurchaseOrder[];
}

export const poRepository: PORepository = {
  async findByNumber(poNumber: string): Promise<PurchaseOrder | null> {
    const all = loadAll();
    return all.find((po) => po.po_number === poNumber) ?? null;
  },
};
