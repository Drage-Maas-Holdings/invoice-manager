## Why

Invoices can now be submitted (steps 5-6) but stall permanently at `pending_approval` — there is no way for staff to approve or reject them, and none of the state-changing actions leave a compliance trail. The PRD requires every state-changing action to be recorded in `audit_log`, and the build order wires it in now (steps 7-8) precisely so it doesn't have to be retrofitted into approval, reconciliation, and reporting later.

## What Changes

- New `audit_log` table, `AuditLogRepository` interface, and SQLite implementation — append-only (create and read, no update/delete).
- New staff approval routes: `POST /api/staff/invoices/:id/approve` and `POST /api/staff/invoices/:id/reject`, each accepting an optional note, gated by the existing staff middleware boundary.
- Status transition enforcement: approve/reject only valid from `pending_approval`; `rejected` is terminal.
- Audit wiring into every existing state-changing action from steps 5-6: vendor invoice submission, staff invoice submission (both including the matching result), plus the new approve and reject actions.
- Actor attribution: nullable `staff_id` / `vendor_id` FKs plus a denormalized `actor_label` snapshot (staff email or vendor name at time of action).

## Capabilities

### New Capabilities

- `audit-log`: append-only audit trail entity — table schema, repository interface, actor attribution rules (exactly one FK populated per actor type, `actor_label` snapshot), and the requirement that every state-changing invoice action writes an entry.
- `invoice-approval`: staff approval workflow — approve/reject routes, optional note, valid-transition enforcement, terminal `rejected` state.

### Modified Capabilities

- `invoice-submission`: submission handlers now also write an audit_log entry recording the submission and its matching result (requirement-level addition to existing routes).

## Impact

- **Schema/migration**: new `audit_log` table (drizzle migration 0003).
- **New code**: `src/repositories/audit-log.ts`, `src/repositories/audit-log.sqlite.ts`, `src/pages/api/staff/invoices/[id]/approve.ts`, `src/pages/api/staff/invoices/[id]/reject.ts`.
- **Modified code**: `src/pages/api/vendor/invoices.ts` and `src/pages/api/staff/invoices.ts` gain audit writes; `src/db/schema.ts` gains the table.
- **Untouched**: `src/lib/session.ts`, `src/middleware.ts` (staff boundary already covers the new routes by path prefix), `InvoiceRepository` interface (already has `updateStatus`).
