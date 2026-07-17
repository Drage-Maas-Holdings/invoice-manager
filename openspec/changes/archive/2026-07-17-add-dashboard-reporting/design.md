## Context

Build steps 5–9 produced the full invoice lifecycle and audit trail, but nothing aggregates across invoices. PRD Section 6 ("Reporting & Visibility") and build step 10 call for a dashboard of total outstanding liabilities bucketed by due date (overdue / this week / this month / later). All the data already exists on the `invoice` table; this step is a read-only query plus one staff route. No schema change, no migration.

The codebase separates pure application-layer logic from repositories and routes (see `matchInvoiceToPO` in `src/lib/matching.ts`, the transition helpers in `src/lib/invoice-approval.ts` and `src/lib/invoice-reconciliation.ts`). Reporting follows the same shape.

## Goals / Non-Goals

**Goals:**
- Return total outstanding liabilities bucketed by due date for staff.
- Keep the bucketing logic a pure, independently testable function that takes invoice records and a reference "now", with no store or clock access of its own.
- Reuse the existing `invoiceRepository.list()` and the `/api/staff/**` middleware gate — no new repository methods, no new access-control code.

**Non-Goals:**
- No forecasting or predictive model — bucketed sums of existing data only (PRD Section 6, Section 8).
- No UI in this change; the HTML dashboard page is build step 12 (Staff UI). This step delivers the query + JSON endpoint the UI will consume.
- No currency normalization — see Risks.

## Decisions

**Bucketing is a pure function, not a SQL query.** `bucketOutstandingLiabilities(invoices, now)` in `src/lib/` filters out `reconciled`/`rejected` and assigns each remaining invoice to one bucket. Rationale: matches the established pure-function pattern, is testable without a database, and the dataset for a single-tenant MVP is small enough that in-memory aggregation over `list()` is not a performance concern. Alternative considered — a Drizzle aggregate query with `CASE`/`GROUP BY` — was rejected as premature optimization that would push date-boundary logic into SQL where it is harder to test and reason about across the null-`due_date` case.

**"Outstanding" = not `reconciled` and not `rejected`.** These are the two statuses that represent "no longer owed": `reconciled` is paid-and-settled, `rejected` is terminal and never payable. Everything else (`submitted`, `pending_approval`, `approved`, `ready_for_payment`) is money the company still owes and belongs on the dashboard. Defining it by exclusion is robust to any future non-terminal status being added.

**Null `due_date` gets its own `undated` bucket.** The PRD lists four date buckets but does not say what to do with a missing due date, and `due_date` is nullable in the schema. Silently dropping those invoices would understate liabilities; forcing them into `overdue` or `later` would misreport them. A distinct `undated` bucket keeps the totals honest and visible.

**`now` is injected.** The route passes `new Date()`; the function takes it as a parameter so week/month boundaries are deterministic under test.

## Risks / Trade-offs

- **Mixed currencies summed naively** → For the MVP the totals are per-currency-agnostic sums, which is only correct if invoices share a currency. Mitigation: acceptable for this release (single company, typically one currency); documented here so a future change can bucket-by-currency without reopening the definition of "outstanding". Not expanding scope now.
- **Week/month boundary definition** → "This week" and "this month" depend on locale/week-start conventions. Mitigation: use calendar-month end and end-of-week from the injected `now` with a single documented convention (week ends Sunday), covered by unit tests so the behavior is pinned rather than incidental.
- **In-memory aggregation** → `list()` loads all invoices. Mitigation: fine at MVP scale; if the table grows, swap the pure function's input for a repository-side aggregate without changing the route contract.

## Migration Plan

Additive only. New file `src/lib/invoice-reporting.ts` and new route `src/pages/api/staff/dashboard.ts`. No migration, no schema change, no rollback steps beyond reverting the two files.
