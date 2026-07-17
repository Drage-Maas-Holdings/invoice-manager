## Purpose

Invoice approval is the single staff-performed approval step in the invoice lifecycle. An invoice sitting at `pending_approval` is moved to `approved` or `rejected` by an authenticated staff member, with an optional note captured in the audit trail. Transitions are valid only from `pending_approval`, making `rejected` terminal by construction. Matching is advisory: an `unmatched` invoice is flagged for the reviewer's attention but is never blocked from approval.

## Requirements

### Requirement: Staff approval route
The system SHALL provide `POST /api/staff/invoices/:id/approve` accepting an optional JSON body `{ note?: string }`. The route MUST be gated by middleware to require a valid staff session. On success it SHALL set the invoice's `status` to `approved` via `InvoiceRepository.updateStatus`, write an `approved` audit entry attributed to the acting staff member (with the note, if provided), and return 200 with the updated invoice record.

#### Scenario: Successful approval
- **WHEN** an authenticated staff member posts to `/api/staff/invoices/:id/approve` for an invoice in `pending_approval`
- **THEN** the invoice status becomes `approved`, an `approved` audit entry attributed to that staff member is written, and the response is 200 with the updated record

#### Scenario: Approval with note
- **WHEN** the request body includes a non-empty `note`
- **THEN** the audit entry's `notes` field contains that note

#### Scenario: Unauthenticated or wrong actor rejected
- **WHEN** a request without a valid staff session (including a vendor session) hits the route
- **THEN** middleware returns 401 before the handler executes

### Requirement: Staff rejection route
The system SHALL provide `POST /api/staff/invoices/:id/reject` accepting an optional JSON body `{ note?: string }`. The route MUST be gated by middleware to require a valid staff session. On success it SHALL set the invoice's `status` to `rejected` via `InvoiceRepository.updateStatus`, write a `rejected` audit entry attributed to the acting staff member (with the note, if provided), and return 200 with the updated invoice record.

#### Scenario: Successful rejection
- **WHEN** an authenticated staff member posts to `/api/staff/invoices/:id/reject` for an invoice in `pending_approval`
- **THEN** the invoice status becomes `rejected`, a `rejected` audit entry attributed to that staff member is written, and the response is 200 with the updated record

#### Scenario: Rejection reason preserved
- **WHEN** an invoice is rejected with a note
- **THEN** the note remains readable in that invoice's audit trail via `findByInvoice`

### Requirement: Transition enforcement
Approve and reject SHALL only be valid for invoices whose current `status` is `pending_approval`. For an invoice in any other status the handler SHALL return 409 and MUST NOT change the invoice or write an audit entry. For an unknown invoice id the handler SHALL return 404. `rejected` is terminal: no route SHALL transition an invoice out of `rejected`.

#### Scenario: Unknown invoice
- **WHEN** approve or reject is posted for an id that matches no invoice
- **THEN** the response is 404 and no audit entry is written

#### Scenario: Already-approved invoice
- **WHEN** approve or reject is posted for an invoice in `approved`
- **THEN** the response is 409, the status is unchanged, and no audit entry is written

#### Scenario: Rejected is terminal
- **WHEN** approve is posted for an invoice in `rejected`
- **THEN** the response is 409 and the invoice remains `rejected`

#### Scenario: Ready for payment is not reversible to approved
- **WHEN** approve is posted for an invoice in `ready_for_payment`
- **THEN** the response is 409 and the status remains `ready_for_payment`

### Requirement: Match status does not gate approval
Approval and rejection SHALL be available for invoices regardless of `match_status` — an `unmatched` invoice is flagged, not blocked. The `match_status` value SHALL remain unchanged by approval or rejection.

#### Scenario: Unmatched invoice can be approved
- **WHEN** a staff member approves an invoice with `match_status: 'unmatched'`
- **THEN** the approval succeeds and `match_status` remains `unmatched` on the approved invoice
