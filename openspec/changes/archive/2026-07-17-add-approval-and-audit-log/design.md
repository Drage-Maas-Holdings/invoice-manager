## Context

Invoices are created at `status: 'pending_approval'` (steps 5-6) but nothing can move them further, and no action leaves a trail. The PRD defines the `audit_log` entity (Section 4), requires every state-changing action to write a row (Section 6, Compliance & Audit), and specifies the actor-attribution rule: nullable `staff_id`/`vendor_id` FKs for referential integrity plus a denormalized `actor_label` snapshot so history stays accurate if a staff or vendor record is later edited (Section 7). The invoice lifecycle (Section 5) states "Every `status` transition, and the matching step, writes an audit_log row."

Existing building blocks this change reuses unchanged: `InvoiceRepository.updateStatus`, the middleware staff boundary (`/api/staff/**` covers the new routes by path prefix), and the repository-interface pattern.

## Goals / Non-Goals

**Goals:**
- Append-only `audit_log` table + `AuditLogRepository` (create and read only).
- Staff approve/reject routes with optional note and strict transition enforcement.
- Audit entries for every state-changing action that exists so far: submission (vendor and staff), the matching step, approve, reject.
- Entry shape ready for steps 9-12 (reconciliation, UIs) to reuse without schema change.

**Non-Goals:**
- No reconciliation or ready_for_payment transitions (step 9).
- No audit-log query API routes or UI (steps 10/12 consume the repository directly).
- No retention policy, anomaly detection, or configurable approval chains.
- No retrofit of audit entries for auth events (login/logout) — the PRD scopes audit to invoice state changes.

## Decisions

**1. Audit writes live in route handlers, not inside `InvoiceRepository`.**
Same layering principle as matching: repositories do single-entity persistence; orchestration is application-layer. Wiring the audit write into `updateStatus` would hide a cross-entity side effect inside a repository and couple every future status change to one audit shape. Alternative rejected: a repository decorator — overkill for four call sites.

**2. Two audit entries per submission: `submitted` (actor = vendor/staff) then the matching result (actor = `system`).**
The lifecycle text treats the matching step as its own auditable event, and it is performed by the system, not the submitter. `action` values: `submitted`, `matched`, `unmatched`, `approved`, `rejected`. The `system` actor type has both FKs null and `actor_label: 'system'`, exactly as the PRD data model specifies.

**3. `action` is a plain TEXT column typed as a string union in TypeScript, not a DB CHECK constraint.**
Steps 9+ add `ready_for_payment` and `reconciled` actions; a CHECK would force a migration each time. Consistent with how `invoice.status` is already handled.

**4. Transition enforcement in the approval handlers: approve/reject only from `pending_approval`.**
Handler loads the invoice via `findById` (404 if absent), checks `status === 'pending_approval'` (409 otherwise), then `updateStatus` + audit write. 409 distinguishes "exists but wrong state" from validation errors (400) and missing (404). `rejected` terminality needs no special case — it falls out of the `pending_approval`-only rule.

**5. `actor_label` is resolved at action time from the session actor's repository record.**
Approve/reject: staff email via `staffRepository.findById(actor.staff_id)`. Submission: vendor name via `vendorRepository.findById` (vendor route) or staff email (staff route — the *actor* is the staff member even though the invoice belongs to a vendor). If the actor record is missing (deleted mid-session), the handler returns 401 rather than writing an unattributable entry.

**6. Status update and audit insert are sequential synchronous calls, not a shared transaction.**
better-sqlite3 calls are synchronous, so the crash window between the two writes is negligible for this MVP, and a cross-repository transaction helper would break the repository-interface boundary. Order: status change first, then audit entry (an audit row claiming a change that didn't happen is worse than a change missing its row). Accepted as a known trade-off below.

**7. Optional note: `notes` column nullable; request body `{ note?: string }`.**
Empty/whitespace-only note is stored as `null`. No length limit beyond SQLite TEXT.

## Risks / Trade-offs

- [Crash between status update and audit insert leaves a transition without a row] → Accepted for MVP: synchronous calls make the window microseconds; revisit with a transaction helper if audit completeness becomes contractual.
- [`actor_label` snapshots go stale by design] → Intentional per PRD: FK gives current identity, label gives historical identity; both stored.
- [Append-only is convention, not enforced by SQLite permissions] → Interface simply has no update/delete methods; the repository-boundary rule (no direct Drizzle access outside repositories) is the enforcement mechanism, as elsewhere.
- [Two entries per submission doubles write volume] → Trivial at MVP scale; keeps the matching step independently visible as the PRD requires.

## Migration Plan

1. Add `audit_log` table to `src/db/schema.ts`; `drizzle-kit generate` → migration 0003; `drizzle-kit migrate`.
2. Additive only — no changes to existing tables; rollback is dropping the new table.

## Open Questions

None — the PRD pins the schema, actor rules, and lifecycle; all discretionary calls are recorded above.
