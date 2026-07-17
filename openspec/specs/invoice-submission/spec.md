## Purpose

Invoice submission provides the API routes for creating invoice records — both vendor self-submission and staff submission on behalf of a vendor. Both routes perform PO matching synchronously before persisting, setting `match_status` to `matched` or `unmatched` at creation time. The initial status is always `pending_approval` because matching completes before the response is returned.

## Requirements

### Requirement: Vendor invoice submission
The system SHALL provide `POST /api/vendor/invoices` accepting a JSON body with fields `invoice_number`, `po_reference`, `amount`, `currency`, `due_date`, `source_document_path` (optional), and `supersedes_invoice_id` (optional). The route MUST be gated by middleware to require a valid vendor session. The vendor submitting the invoice is implicitly the invoice's vendor — the `vendor_id` is read from `context.locals.actor.vendor_id`, not from the request body.

#### Scenario: Successful vendor submission
- **WHEN** an authenticated vendor posts valid invoice fields to `/api/vendor/invoices`
- **THEN** the invoice is created with `vendor_id` from the session, `status: 'pending_approval'`, `match_status` computed from PO matching, and a 201 response returns the created invoice record

#### Scenario: Unauthenticated request rejected
- **WHEN** a request without a valid vendor session hits `POST /api/vendor/invoices`
- **THEN** middleware returns 401 before the handler executes

#### Scenario: Wrong actor type rejected
- **WHEN** a staff session hits `POST /api/vendor/invoices`
- **THEN** middleware returns 401 before the handler executes

#### Scenario: Missing required fields
- **WHEN** a vendor posts a body missing `invoice_number`, `po_reference`, `amount`, or `currency`
- **THEN** the handler returns 400 with a message identifying the missing fields

#### Scenario: Invalid amount
- **WHEN** a vendor posts an `amount` that is negative or not a number
- **THEN** the handler returns 400

#### Scenario: Optional source_document_path
- **WHEN** a vendor omits `source_document_path` from the request body
- **THEN** the invoice is created with `source_document_path` set to `null`

#### Scenario: Optional supersedes_invoice_id
- **WHEN** a vendor includes a valid `supersedes_invoice_id` referencing an existing invoice
- **THEN** the new invoice is created with that reference set

#### Scenario: Invalid supersedes_invoice_id
- **WHEN** a vendor includes a `supersedes_invoice_id` that does not reference an existing invoice
- **THEN** the handler returns 400

### Requirement: Staff invoice submission on behalf of vendor
The system SHALL provide `POST /api/staff/invoices` accepting a JSON body with fields `vendor_id`, `invoice_number`, `po_reference`, `amount`, `currency`, `due_date`, `source_document_path` (optional), and `supersedes_invoice_id` (optional). The route MUST be gated by middleware to require a valid staff session. Staff explicitly provides the `vendor_id` in the body since the vendor is not the authenticated actor.

#### Scenario: Successful staff submission
- **WHEN** an authenticated staff member posts valid invoice fields including `vendor_id` to `/api/staff/invoices`
- **THEN** the invoice is created with the provided `vendor_id`, `status: 'pending_approval'`, `match_status` computed from PO matching, and a 201 response returns the created invoice record

#### Scenario: Missing vendor_id
- **WHEN** a staff member posts a body missing `vendor_id`
- **THEN** the handler returns 400 with a message identifying the missing field

#### Scenario: Non-existent vendor_id
- **WHEN** a staff member posts a `vendor_id` that does not match any existing vendor
- **THEN** the handler returns 400

#### Scenario: Unauthenticated request rejected
- **WHEN** a request without a valid staff session hits `POST /api/staff/invoices`
- **THEN** middleware returns 401 before the handler executes

#### Scenario: Wrong actor type rejected
- **WHEN** a vendor session hits `POST /api/staff/invoices`
- **THEN** middleware returns 401 before the handler executes

### Requirement: PO matching on submission
Invoice submission SHALL perform PO matching before persisting the invoice record. The handler SHALL call `PORepository.findByNumber(invoice.po_reference)`, then call `matchInvoiceToPO(invoice, po)`. The resulting `match_status` (`matched` or `unmatched`) SHALL be set on the invoice record at creation time.

#### Scenario: Matched invoice
- **WHEN** a matching PO is found and all fields (vendor name, amount, currency) match
- **THEN** the created invoice has `match_status: 'matched'`

#### Scenario: Unmatched invoice — no PO found
- **WHEN** no PO is found for the given `po_reference`
- **THEN** the created invoice has `match_status: 'unmatched'` (not rejected — the invoice proceeds to `pending_approval` normally)

#### Scenario: Unmatched invoice — PO exists but fields differ
- **WHEN** a PO is found but vendor name, amount, or currency differs from the invoice
- **THEN** the created invoice has `match_status: 'unmatched'`

### Requirement: PO read failure fails submission
If `PORepository.findByNumber` throws (due to missing file, malformed JSON, or invalid entries), the invoice submission SHALL fail with a 500 error and NO invoice record SHALL be persisted.

#### Scenario: Missing PO data file
- **WHEN** a vendor submits an invoice while the PO JSON file is missing
- **THEN** the handler returns 500 and no invoice is created in the database

#### Scenario: Malformed PO data file
- **WHEN** a vendor submits an invoice while the PO JSON file contains invalid JSON
- **THEN** the handler returns 500 and no invoice is created in the database

### Requirement: Status starts at pending_approval
After successful submission and matching, the invoice SHALL be created with `status: 'pending_approval'`. The `submitted` status value SHALL exist in the TypeScript enum but is not set at creation because matching runs synchronously before the response is returned.

#### Scenario: New invoice is immediately pending_approval
- **WHEN** a vendor successfully submits an invoice
- **THEN** the returned invoice record shows `status: 'pending_approval'`

### Requirement: Submission writes audit entries
Both submission routes (`POST /api/vendor/invoices` and `POST /api/staff/invoices`) SHALL, after successfully creating the invoice, write two audit entries via `AuditLogRepository`: a `submitted` entry attributed to the authenticated actor (vendor name for vendor submissions, staff email for staff submissions — the actor is the submitter, even when staff submits on a vendor's behalf), and a `matched` or `unmatched` entry with `actor_type: 'system'` recording the matching result. Failed submissions (validation errors, PO read failures) MUST NOT write any audit entry.

#### Scenario: Vendor submission audited
- **WHEN** a vendor successfully submits an invoice
- **THEN** a `submitted` entry with `actor_type: 'vendor'`, that vendor's id, and their name as `actor_label` is written, followed by a system entry with the matching result

#### Scenario: Staff submission audited
- **WHEN** a staff member successfully submits an invoice on behalf of a vendor
- **THEN** the `submitted` entry has `actor_type: 'staff'` with the staff member's id and email — not the vendor's identity

#### Scenario: Failed submission writes nothing
- **WHEN** a submission fails validation or the PO data source read throws
- **THEN** no invoice and no audit entries are persisted
