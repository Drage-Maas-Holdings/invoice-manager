## ADDED Requirements

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
