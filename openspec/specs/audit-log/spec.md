## Purpose

Audit log is the append-only compliance trail for the invoice-manager module: every action that creates an invoice or changes its `status`, plus the matching step, writes exactly one row. Entries are attributed by nullable `staff_id`/`vendor_id` foreign key for referential integrity and querying, alongside a denormalized `actor_label` snapshot so historical entries stay accurate even if the underlying staff or vendor record is later edited. The repository exposes no update or delete methods — the trail is immutable by construction.

## Requirements

### Requirement: Audit log table schema
The system SHALL persist audit entries in an `audit_log` table with columns `id` (TEXT PK), `invoice_id` (TEXT NOT NULL, FK to invoice.id), `actor_type` (TEXT NOT NULL, one of `staff` / `vendor` / `system`), `staff_id` (TEXT, nullable FK to staff.id), `vendor_id` (TEXT, nullable FK to vendor.id), `actor_label` (TEXT NOT NULL, denormalized snapshot: staff email or vendor name at time of action, or `system`), `action` (TEXT NOT NULL), `notes` (TEXT, nullable), and `created_at` (INTEGER timestamp, NOT NULL).

#### Scenario: Entry persisted with all fields
- **WHEN** a valid audit entry is inserted
- **THEN** the row is stored with all values intact and `created_at` set to the insertion timestamp

#### Scenario: Entry references its invoice
- **WHEN** an audit entry is created for an invoice
- **THEN** `invoice_id` references that existing invoice record

### Requirement: Actor attribution rule
Exactly one of `staff_id` / `vendor_id` SHALL be populated when `actor_type` is `staff` or `vendor` respectively, and both SHALL be null when `actor_type` is `system`. The repository MUST reject entries violating this rule. `actor_label` SHALL be captured at action time (staff email, vendor name, or the literal `system`) so historical entries remain accurate if the underlying staff or vendor record is later edited.

#### Scenario: Staff entry attribution
- **WHEN** an entry is created with `actor_type: 'staff'`
- **THEN** `staff_id` is set, `vendor_id` is null, and `actor_label` is that staff member's email at time of action

#### Scenario: Vendor entry attribution
- **WHEN** an entry is created with `actor_type: 'vendor'`
- **THEN** `vendor_id` is set, `staff_id` is null, and `actor_label` is that vendor's name at time of action

#### Scenario: System entry attribution
- **WHEN** an entry is created with `actor_type: 'system'`
- **THEN** both `staff_id` and `vendor_id` are null and `actor_label` is `system`

#### Scenario: Invalid attribution rejected
- **WHEN** an entry is created with `actor_type: 'staff'` but no `staff_id`, or with both `staff_id` and `vendor_id` set
- **THEN** the repository throws and no row is persisted

### Requirement: Append-only AuditLogRepository interface
The system SHALL provide an `AuditLogRepository` interface with exactly `create(data: CreateAuditLogData): AuditLogRecord` and `findByInvoice(invoiceId: string): AuditLogRecord[]` (returned in ascending `created_at` order). The interface MUST NOT include update or delete methods. All reads and writes to audit data MUST go through this interface — no code outside the repository implementation may call the Drizzle client for audit data. The SQLite implementation SHALL export a module-level singleton `auditLogRepository`.

#### Scenario: Create returns the full record
- **WHEN** `create` is called with valid data
- **THEN** it returns an `AuditLogRecord` with generated `id` and `created_at`

#### Scenario: findByInvoice returns chronological trail
- **WHEN** `findByInvoice` is called for an invoice with multiple entries
- **THEN** all entries for that invoice are returned in ascending `created_at` order, and an empty array is returned for an invoice with no entries

#### Scenario: No mutation methods
- **WHEN** the `AuditLogRepository` interface is inspected
- **THEN** it exposes no method that updates or deletes an existing entry

### Requirement: Every state-changing invoice action writes an entry
Every action that creates an invoice or changes its `status`, and the matching step, SHALL write an `audit_log` row recording the actor, the action, and the timestamp. As of this change that covers: vendor submission (`submitted`), staff submission (`submitted`), the matching step (`matched` or `unmatched`, actor_type `system`), approval (`approved`), and rejection (`rejected`).

#### Scenario: Submission writes two entries
- **WHEN** an invoice is successfully submitted by a vendor or staff member
- **THEN** a `submitted` entry attributed to the submitter and a `matched` or `unmatched` entry attributed to `system` are both written for that invoice

#### Scenario: Approval writes an entry
- **WHEN** a staff member approves or rejects an invoice
- **THEN** an `approved` or `rejected` entry attributed to that staff member is written for that invoice
