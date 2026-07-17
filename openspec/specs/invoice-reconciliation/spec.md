## Purpose

Invoice reconciliation provides staff-only manual status transitions from `approved` through `ready_for_payment` to `reconciled`, with audit trail. Payment is recorded as happening outside the system; the reconciliation step records the fact of payment for lifecycle tracking.

## Requirements

### Requirement: Mark ready for payment route
The system SHALL provide `POST /api/staff/invoices/:id/ready-for-payment` accepting an optional JSON body `{ note?: string }`. The route MUST be gated by middleware to require a valid staff session. On success it SHALL set the invoice's `status` to `ready_for_payment` via `InvoiceRepository.updateStatus`, write a `ready_for_payment` audit entry attributed to the acting staff member (with the note, if provided), and return 200 with the updated invoice record.

#### Scenario: Successful transition to ready for payment
- **WHEN** an authenticated staff member posts to `/api/staff/invoices/:id/ready-for-payment` for an invoice in `approved`
- **THEN** the invoice status becomes `ready_for_payment`, a `ready_for_payment` audit entry attributed to that staff member is written, and the response is 200 with the updated record

#### Scenario: Ready for payment with note
- **WHEN** the request body includes a non-empty `note`
- **THEN** the audit entry's `notes` field contains that note

#### Scenario: Unauthenticated or wrong actor rejected
- **WHEN** a request without a valid staff session (including a vendor session) hits the route
- **THEN** middleware returns 401 before the handler executes

### Requirement: Reconcile route
The system SHALL provide `POST /api/staff/invoices/:id/reconcile` accepting an optional JSON body `{ note?: string }`. The route MUST be gated by middleware to require a valid staff session. On success it SHALL set the invoice's `status` to `reconciled` via `InvoiceRepository.updateStatus`, write a `reconciled` audit entry attributed to the acting staff member (with the note, if provided), and return 200 with the updated invoice record.

#### Scenario: Successful reconciliation
- **WHEN** an authenticated staff member posts to `/api/staff/invoices/:id/reconcile` for an invoice in `ready_for_payment`
- **THEN** the invoice status becomes `reconciled`, a `reconciled` audit entry attributed to that staff member is written, and the response is 200 with the updated record

#### Scenario: Reconcile with note
- **WHEN** the request body includes a non-empty `note`
- **THEN** the audit entry's `notes` field contains that note

#### Scenario: Unauthenticated or wrong actor rejected
- **WHEN** a request without a valid staff session (including a vendor session) hits the route
- **THEN** middleware returns 401 before the handler executes

### Requirement: Reconciliation transition enforcement
Ready-for-payment and reconcile SHALL only be valid for invoices whose current `status` matches the expected source status (`approved` for ready-for-payment, `ready_for_payment` for reconcile). For an invoice in any other status the handler SHALL return 409 and MUST NOT change the invoice or write an audit entry. For an unknown invoice id the handler SHALL return 404.

#### Scenario: Unknown invoice
- **WHEN** ready-for-payment or reconcile is posted for an id that matches no invoice
- **THEN** the response is 404 and no audit entry is written

#### Scenario: Wrong source status for ready for payment
- **WHEN** ready-for-payment is posted for an invoice in `pending_approval`
- **THEN** the response is 409, the status is unchanged, and no audit entry is written

#### Scenario: Wrong source status for reconcile
- **WHEN** reconcile is posted for an invoice in `approved`
- **THEN** the response is 409, the status is unchanged, and no audit entry is written

#### Scenario: Reconcile from rejected is blocked
- **WHEN** reconcile is posted for an invoice in `rejected`
- **THEN** the response is 409 and the invoice remains `rejected`
