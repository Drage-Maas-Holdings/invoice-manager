export type AuditActorType = 'staff' | 'vendor' | 'system';

export type AuditAction = 'submitted' | 'matched' | 'unmatched' | 'approved' | 'rejected' | 'ready_for_payment' | 'reconciled';

export interface AuditLogRecord {
  id: string;
  invoice_id: string;
  actor_type: AuditActorType;
  staff_id: string | null;
  vendor_id: string | null;
  actor_label: string;
  action: AuditAction;
  notes: string | null;
  created_at: Date;
}

export interface CreateAuditLogData {
  id?: string;
  invoice_id: string;
  actor_type: AuditActorType;
  staff_id?: string | null;
  vendor_id?: string | null;
  actor_label: string;
  action: AuditAction;
  notes?: string | null;
}

export interface AuditLogRepository {
  create(data: CreateAuditLogData): AuditLogRecord;
  findByInvoice(invoiceId: string): AuditLogRecord[];
}
