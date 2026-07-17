import type { APIContext } from 'astro';
import { invoiceRepository } from '../repositories/invoice.sqlite';
import { staffRepository } from '../repositories/staff.sqlite';
import { auditLogRepository } from '../repositories/audit-log.sqlite';
import type { InvoiceStatus } from '../repositories/invoice';
import type { AuditAction } from '../repositories/audit-log';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Shared staff-only invoice transition: approve or reject. Both are valid only
 * from `pending_approval`; any other status is a 409 with no state change and no
 * audit entry, so `rejected` terminality falls out of the single-source rule.
 */
export async function transitionInvoice(
  context: APIContext,
  targetStatus: Extract<InvoiceStatus, 'approved' | 'rejected'>,
  action: Extract<AuditAction, 'approved' | 'rejected'>,
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

  if (invoice.status !== 'pending_approval') {
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

  // Status change first, then audit entry: a status change missing its audit
  // row is preferable to an audit row claiming a change that didn't happen. The
  // gap between these two synchronous calls is an accepted trade-off (design
  // decision #6) — revisit with a cross-repository transaction only if audit
  // completeness becomes contractual.
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
