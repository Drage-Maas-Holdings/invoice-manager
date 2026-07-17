## Why

Approved invoices currently have no path to payment or reconciliation. The PRD defines a full lifecycle (`approved → ready_for_payment → reconciled`) but only the approval step is implemented. Staff need a way to manually mark invoices as ready for payment and to record reconciliation once payment occurs outside the system.

## What Changes

- Add `POST /api/staff/invoices/[id]/ready-for-payment` — transitions an invoice from `approved` to `ready_for_payment`, with audit log entry
- Add `POST /api/staff/invoices/[id]/reconcile` — transitions an invoice from `ready_for_payment` to `reconciled`, with audit log entry
- Extend `AuditAction` type with `'ready_for_payment'` and `'reconciled'` values

## Capabilities

### New Capabilities

- `invoice-reconciliation`: Staff-only manual status transitions from `approved` through `ready_for_payment` to `reconciled`, with audit trail

### Modified Capabilities

- `invoice-approval`: `AuditAction` type extended with new action values for the reconciliation stages

## Impact

- `src/pages/api/staff/invoices/[id]/` — two new route files
- `src/repositories/audit-log.ts` — `AuditAction` type extended
- `drizzle/` — new migration (no schema changes; status is TEXT)
- No new dependencies, no changes to vendor or auth flows
