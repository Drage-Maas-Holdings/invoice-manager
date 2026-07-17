export type InvoiceStatus = 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'ready_for_payment' | 'reconciled';

export type MatchStatus = 'matched' | 'unmatched' | 'not_checked';

export interface InvoiceRecord {
  id: string;
  vendor_id: string;
  invoice_number: string;
  po_reference: string;
  amount: number;
  currency: string;
  due_date: Date | null;
  source_document_path: string | null;
  status: InvoiceStatus;
  match_status: MatchStatus;
  supersedes_invoice_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateInvoiceData {
  id?: string;
  vendor_id: string;
  invoice_number: string;
  po_reference: string;
  amount: number;
  currency: string;
  due_date?: Date | null;
  source_document_path?: string | null;
  status: InvoiceStatus;
  match_status: MatchStatus;
  supersedes_invoice_id?: string | null;
}

export interface InvoiceRepository {
  create(data: CreateInvoiceData): InvoiceRecord;
  findById(id: string): InvoiceRecord | null;
  findByVendor(vendorId: string): InvoiceRecord[];
  updateStatus(id: string, status: InvoiceStatus): InvoiceRecord;
  list(): InvoiceRecord[];
}
