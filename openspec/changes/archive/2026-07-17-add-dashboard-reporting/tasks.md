## 1. Reporting Logic

- [x] 1.1 Create `src/lib/invoice-reporting.ts` with a pure `bucketOutstandingLiabilities(invoices, now)` function that excludes `reconciled` and `rejected` invoices and assigns each remaining invoice to exactly one of `overdue`, `this_week`, `this_month`, `later`, or `undated` (null `due_date`), returning `{ total, count }` per bucket
- [x] 1.2 Define and export the return type (bucket keys → `{ total: number; count: number }`)

## 2. API Route

- [x] 2.1 Create `src/pages/api/staff/dashboard.ts` — GET route that calls `invoiceRepository.list()`, passes the records and `new Date()` to `bucketOutstandingLiabilities`, and returns the buckets as JSON (200)
- [x] 2.2 Confirm the route is covered by the existing `/api/staff/**` middleware gate (no per-handler `actor_type` check needed)

## 3. Tests

- [x] 3.1 Add `src/lib/invoice-reporting.test.ts` covering: overdue, this_week, this_month, later, and undated assignment; exclusion of `reconciled` and `rejected`; correct per-bucket totals and counts with an injected fixed `now`

## 4. Verification

- [x] 4.1 Run `npm run build` and the test suite to verify no type errors and passing tests
- [x] 4.2 Manually hit `GET /api/staff/dashboard` with a staff session and confirm bucketed totals; confirm a request without a staff session is rejected by middleware
