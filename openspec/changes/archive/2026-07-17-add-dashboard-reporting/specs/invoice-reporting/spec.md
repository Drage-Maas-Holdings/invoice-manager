## ADDED Requirements

### Requirement: Outstanding liabilities dashboard
The system SHALL expose a staff-only reporting query that returns the total outstanding liabilities across all invoices, bucketed by due date. "Outstanding" SHALL mean any invoice whose `status` is not `reconciled` and not `rejected`; these represent amounts still owed. Invoices in `reconciled` (already settled) or `rejected` (terminal, never payable) status SHALL be excluded from all buckets.

The query SHALL be reachable via `GET /api/staff/dashboard`, gated by the existing `/api/staff/**` middleware, and SHALL return per-bucket total amount and invoice count.

#### Scenario: Buckets returned for staff request
- **WHEN** an authenticated staff account requests `GET /api/staff/dashboard`
- **THEN** the response is 200 with a JSON body containing `overdue`, `this_week`, `this_month`, `later`, and `undated` buckets, each with a summed `total` and a `count`

#### Scenario: Non-staff request rejected
- **WHEN** a request to `GET /api/staff/dashboard` arrives without a staff session
- **THEN** the request is rejected by middleware before the handler runs

#### Scenario: Reconciled and rejected invoices excluded
- **WHEN** the dashboard is computed and some invoices are `reconciled` or `rejected`
- **THEN** those invoices contribute to no bucket total or count

### Requirement: Due-date bucketing
Outstanding invoices SHALL be assigned to exactly one bucket based on `due_date` relative to the current date: `overdue` when `due_date` is before today, `this_week` when `due_date` falls from today through the end of the current week, `this_month` when after this week but within the current month, and `later` when beyond the current month. An invoice with a null `due_date` SHALL be assigned to the `undated` bucket rather than dropped or coerced into a dated bucket.

#### Scenario: Overdue invoice
- **WHEN** an outstanding invoice has a `due_date` before today
- **THEN** its amount and count contribute to the `overdue` bucket only

#### Scenario: Invoice with no due date
- **WHEN** an outstanding invoice has a null `due_date`
- **THEN** its amount and count contribute to the `undated` bucket only

#### Scenario: Later invoice
- **WHEN** an outstanding invoice has a `due_date` beyond the end of the current month
- **THEN** its amount and count contribute to the `later` bucket only
