## Why

Staff have no aggregate view of accounts-payable exposure — every invoice must be inspected individually. The PRD (Section 6, "Reporting & Visibility", and build step 10) calls for a dashboard showing total outstanding liabilities bucketed by due date so staff can see, at a glance, what is overdue and what is coming due.

## What Changes

- Add a read-only reporting query over the `invoice` store that sums outstanding liabilities and buckets them by due date into `overdue`, `this_week`, `this_month`, and `later`.
- "Outstanding" is defined as invoices whose `status` is not terminal-for-payment — i.e. everything not yet `reconciled` and not `rejected`. These are the amounts the company still owes.
- Add a staff-only `GET /api/staff/dashboard` route returning the bucketed totals (and a count per bucket), gated by the existing `/api/staff/**` middleware.
- Invoices with a null `due_date` are grouped under a dedicated `undated` bucket rather than being silently dropped or forced into a date bucket.
- Bucketed sums of existing data only — no forecasting, no predictive model (explicitly out of scope per PRD Section 6).

## Capabilities

### New Capabilities

- `invoice-reporting`: Staff-only aggregate reporting over invoices — total outstanding liabilities bucketed by due date, exposed as a dashboard query behind the staff session gate.

### Modified Capabilities

<!-- None. No existing requirements change; this is purely additive read-only reporting. -->

## Impact

- `src/lib/` — new pure bucketing function operating on invoice records (independently testable, no store access).
- `src/repositories/invoice.ts` / `invoice.sqlite.ts` — the existing `list()` method is sufficient; no schema change and no new migration.
- `src/pages/api/staff/dashboard.ts` — new GET route calling the repository and the bucketing function.
- No new dependencies, no changes to vendor, auth, matching, or approval flows.
