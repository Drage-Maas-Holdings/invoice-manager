export interface PurchaseOrder {
  po_number: string;
  vendor_name: string;
  total_amount: number;
  currency: string;
}

export interface PORepository {
  findByNumber(poNumber: string): Promise<PurchaseOrder | null>;
}
