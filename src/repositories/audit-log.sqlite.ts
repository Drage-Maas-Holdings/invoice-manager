import { db } from '../db/client';
import { audit_log } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { AuditLogRecord, AuditLogRepository, AuditActorType, AuditAction } from './audit-log';

function rowToRecord(row: typeof audit_log.$inferSelect): AuditLogRecord {
  return {
    id: row.id,
    invoice_id: row.invoice_id,
    actor_type: row.actor_type as AuditActorType,
    staff_id: row.staff_id,
    vendor_id: row.vendor_id,
    actor_label: row.actor_label,
    action: row.action as AuditAction,
    notes: row.notes,
    created_at: row.created_at,
  };
}

function validateAttribution(actorType: AuditActorType, staffId: string | null, vendorId: string | null): void {
  switch (actorType) {
    case 'staff':
      if (!staffId || vendorId) {
        throw new Error('Audit entry with actor_type "staff" must set staff_id and leave vendor_id null');
      }
      break;
    case 'vendor':
      if (!vendorId || staffId) {
        throw new Error('Audit entry with actor_type "vendor" must set vendor_id and leave staff_id null');
      }
      break;
    case 'system':
      if (staffId || vendorId) {
        throw new Error('Audit entry with actor_type "system" must leave both staff_id and vendor_id null');
      }
      break;
  }
}

export const auditLogRepository: AuditLogRepository = {
  create(data) {
    const staff_id = data.staff_id ?? null;
    const vendor_id = data.vendor_id ?? null;
    validateAttribution(data.actor_type, staff_id, vendor_id);

    const id = data.id ?? randomUUID();
    const now = new Date();
    db.insert(audit_log).values({
      id,
      invoice_id: data.invoice_id,
      actor_type: data.actor_type,
      staff_id,
      vendor_id,
      actor_label: data.actor_label,
      action: data.action,
      notes: data.notes ?? null,
      created_at: now,
    }).run();
    return {
      id,
      invoice_id: data.invoice_id,
      actor_type: data.actor_type,
      staff_id,
      vendor_id,
      actor_label: data.actor_label,
      action: data.action,
      notes: data.notes ?? null,
      created_at: now,
    };
  },

  findByInvoice(invoiceId) {
    return db.select().from(audit_log).where(eq(audit_log.invoice_id, invoiceId)).orderBy(asc(audit_log.created_at)).all().map(rowToRecord);
  },
};
