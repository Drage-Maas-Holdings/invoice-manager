## Context

The invoice lifecycle defined in the PRD is `submitted → pending_approval → approved → ready_for_payment → reconciled`. Steps through approval are implemented (build steps 5–8), but no route transitions invoices beyond `approved`. The `ready_for_payment` and `reconciled` status values exist in the TypeScript type but are never set by any code. Staff need a way to manually advance approved invoices toward payment and record reconciliation.

The existing approval workflow (`invoice-approval.ts`) provides a reusable pattern: a shared transition function that validates current status, updates via `InvoiceRepository.updateStatus`, and writes an audit entry. The reconciliation routes follow the same pattern with different source/target status pairs.

## Goals / Non-Goals

**Goals:**
- Two staff-only routes: `ready_for_payment` (from `approved`) and `reconciled` (from `ready_for_payment`)
- Same structural guarantees as approval: middleware enforcement, status validation, audit log write
- Minimal new code — reuse the existing transition pattern

**Non-Goals:**
- Automatic transition to `ready_for_payment` on approval
- Payment initiation or banking integration
- Bulk reconciliation
- Any vendor-facing reconciliation UI

## Decisions

### Reuse the transition function pattern, but with a new function

**Decision:** Create `transitionToReconcile` in a new `src/lib/invoice-reconciliation.ts`, following the same shape as `transitionInvoice` in `invoice-approval.ts` but parameterized for the reconciliation status pairs.

**Alternative considered:** Generalize `transitionInvoice` to accept any valid source/target pair. Rejected because the approval function's type narrowing (`Extract<InvoiceStatus, 'approved' | 'rejected'>`) is specific to that workflow, and over-generalizing would weaken the type safety that currently prevents invalid transitions at compile time.

**Rationale:** Keeps the two concerns (approval vs. reconciliation) in separate files, matching the existing split. Each file owns its valid transitions with strict typing.

### Two separate route files

**Decision:** `ready-for-payment.ts` and `reconcile.ts` as separate route files under `src/pages/api/staff/invoices/[id]/`.

**Rationale:** Matches the existing `approve.ts` / `reject.ts` split. One file per HTTP endpoint is the established convention.

### Audit action values

**Decision:** Extend `AuditAction` with `'ready_for_payment'` and `'reconciled'`.

**Alternative considered:** Reuse `'approved'` for both transitions. Rejected — audit entries must distinguish between the approval action and the reconciliation actions to maintain a meaningful trail.

### No schema migration needed

**Decision:** The `status` column is TEXT with no CHECK constraint. New status values (`ready_for_payment`, `reconciled`) are enforced at the application layer only, consistent with all existing status values.

## Risks / Trade-offs

- **Two synchronous writes without transaction** → Same trade-off as approval (design decision #6 in the approval change). Status change and audit entry are two separate calls. Accepted for MVP; revisit if audit completeness becomes contractual.
- **No `ready_for_payment` → `approved` rollback** → If a staff member marks an invoice ready for payment by mistake, there is no route to reverse it. This matches the PRD's minimal design; a future release could add rollback if needed.
