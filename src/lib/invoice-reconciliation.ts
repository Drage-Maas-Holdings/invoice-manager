import type { APIContext } from 'astro';
import { invoiceRepository } from '../repositories/invoice.sqlite';
import { staffRepository } from '../repositories/staff.sqlite';
import { auditLogRepository } from '../repositories/audit-log.sqlite';
import type { InvoiceStatus } from '../repositories/invoice';
import type { AuditAction } from '../repositories/audit-log';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function transitionToReconcile(
  context: APIContext,
  sourceStatus: InvoiceStatus,
  targetStatus: InvoiceStatus,
  action: AuditAction,
): Promise<Response> {
  const actor = context.locals.actor as { actor_type: 'staff'; staff_id: string };

  const staffMember = staffRepository.findById(actor.staff_id);
  if (!staffMember) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: JSON_HEADERS });
  }

  const id = context.params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Invoice id is required' }), { status: 400, headers: JSON_HEADERS });
  }

  const invoice = invoiceRepository.findById(id);
  if (!invoice) {
    return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404, headers: JSON_HEADERS });
  }

  if (invoice.status !== sourceStatus) {
    return new Response(
      JSON.stringify({ error: `Invoice cannot be ${action} from status "${invoice.status}"` }),
      { status: 409, headers: JSON_HEADERS },
    );
  }

  let note: string | null = null;
  if (context.request.headers.get('content-type')?.includes('application/json')) {
    try {
      const body = await context.request.json();
      if (typeof body?.note === 'string' && body.note.trim()) {
        note = body.note.trim();
      }
    } catch {
      // No body / invalid JSON — note stays null; the note is optional.
    }
  }

  const updated = invoiceRepository.updateStatus(id, targetStatus);
  auditLogRepository.create({
    invoice_id: id,
    actor_type: 'staff',
    staff_id: staffMember.id,
    actor_label: staffMember.email,
    action,
    notes: note,
  });

  return new Response(JSON.stringify(updated), { status: 200, headers: JSON_HEADERS });
}
