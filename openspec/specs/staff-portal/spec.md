## Purpose

Staff need an authenticated portal to review every invoice in the system, inspect its audit trail, and drive the workflow through the approve, ready-for-payment, and reconcile transitions via the existing staff API routes.

## Requirements

### Requirement: Staff login page
The system SHALL serve a public login page at `/staff/login` with a form collecting email and password that submits to `POST /api/auth/staff/login`. On successful login the staff member SHALL be taken to `/staff`; on failure the page SHALL show a generic error that does not reveal whether the email exists. The login page MUST remain reachable without a session.

#### Scenario: Login page reachable without a session
- **WHEN** a request without any session hits `/staff/login`
- **THEN** the page is served (not redirected) with the login form

#### Scenario: Successful login lands on the invoice list
- **WHEN** a staff member submits a correct email and password
- **THEN** a staff session cookie is set and they arrive at `/staff`

#### Scenario: Failed login shows a generic error
- **WHEN** a staff member submits an incorrect email or password
- **THEN** the page shows a generic "invalid email or password" error and no session is set

### Requirement: Staff invoice list
The `/staff` page SHALL list all invoices, read server-side via the invoice repository, each row showing the vendor name, invoice number, PO reference, amount, currency, due date, workflow `status`, and `match_status`, and linking to that invoice's detail page. The page SHALL also display a compact outstanding-liabilities summary derived from the same bucketing used by the dashboard query.

#### Scenario: All invoices listed for staff
- **WHEN** an authenticated staff member opens `/staff`
- **THEN** the page lists every invoice with vendor name, number, PO reference, amount, currency, due date, status, and match status, each linking to its detail page

#### Scenario: Outstanding-liabilities summary shown
- **WHEN** an authenticated staff member opens `/staff`
- **THEN** the page shows outstanding totals bucketed by due date (overdue, this week, this month, later, undated)

### Requirement: Invoice detail and audit trail
The `/staff/invoices/[id]` page SHALL show the invoice's full fields and its complete audit trail in chronological order, each entry showing the actor label, action, optional note, and timestamp. A request for a non-existent invoice id SHALL result in a 404.

#### Scenario: Detail shows invoice and audit history
- **WHEN** an authenticated staff member opens an existing invoice's detail page
- **THEN** the page shows the invoice fields and every audit entry with actor, action, note, and timestamp

#### Scenario: Unknown invoice id is 404
- **WHEN** an authenticated staff member requests `/staff/invoices/<unknown-id>`
- **THEN** the page responds 404

### Requirement: Status-appropriate review actions
The invoice detail page SHALL present only the actions valid for the invoice's current `status`, each posting to the corresponding existing staff route: from `pending_approval`, Approve and Reject (each with an optional note); from `approved`, Mark ready for payment; from `ready_for_payment`, Mark reconciled. Invoices in a terminal state (`rejected` or `reconciled`) SHALL present no actions. After a successful action the page SHALL reflect the new status and the new audit entry.

#### Scenario: Pending invoice offers approve and reject
- **WHEN** the detail page is shown for an invoice in `pending_approval`
- **THEN** Approve and Reject controls are present and no ready-for-payment or reconcile control is shown

#### Scenario: Approved invoice offers ready for payment
- **WHEN** the detail page is shown for an invoice in `approved`
- **THEN** a Mark-ready-for-payment control is present and approve/reject/reconcile controls are not

#### Scenario: Ready-for-payment invoice offers reconcile
- **WHEN** the detail page is shown for an invoice in `ready_for_payment`
- **THEN** a Mark-reconciled control is present and no other action control is shown

#### Scenario: Terminal invoice offers no actions
- **WHEN** the detail page is shown for an invoice in `rejected` or `reconciled`
- **THEN** no action control is shown

#### Scenario: Action reflects new state
- **WHEN** a staff member approves a `pending_approval` invoice from the detail page
- **THEN** the page reflects `approved` status and shows the new audit entry

### Requirement: Staff logout
The staff UI SHALL provide a logout control that submits to `POST /api/auth/logout`, clearing the session and returning the staff member to `/staff/login`.

#### Scenario: Logout clears the session
- **WHEN** an authenticated staff member triggers logout
- **THEN** the session cookie is cleared and a subsequent request to `/staff` redirects to `/staff/login`
