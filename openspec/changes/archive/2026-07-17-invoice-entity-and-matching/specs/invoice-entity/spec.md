## ADDED Requirements

### Requirement: Invoice table schema
The system SHALL persist invoices in an `invoice` table with columns `id` (TEXT PK), `vendor_id` (TEXT NOT NULL, FK to vendor.id), `invoice_number` (TEXT NOT NULL), `po_reference` (TEXT NOT NULL), `amount` (REAL NOT NULL), `currency` (TEXT NOT NULL), `due_date` (INTEGER, timestamp), `source_document_path` (TEXT), `status` (TEXT NOT NULL), `match_status` (TEXT NOT NULL), `supersedes_invoice_id` (TEXT, nullable, self-referencing FK to invoice.id), `created_at` (INTEGER, timestamp, NOT NULL), and `updated_at` (INTEGER, timestamp, NOT NULL), with a composite unique constraint on `(vendor_id, invoice_number)`.

#### Scenario: Invoice persisted with all fields
- **WHEN** a valid invoice is inserted with all required fields
- **THEN** the row is stored in the `invoice` table with all values intact and `created_at` and `updated_at` set to the insertion timestamp

#### Scenario: Duplicate invoice number for same vendor rejected
- **WHEN** an invoice is inserted with a `vendor_id` and `invoice_number` that already exist as a pair
- **THEN** the database rejects the insert with a uniqueness constraint violation

#### Scenario: Different vendors can use same invoice number
- **WHEN** an invoice with `invoice_number` "INV-001" exists for vendor A, and a new invoice with the same number is inserted for vendor B
- **THEN** the insert succeeds because the composite key `(vendor_id, invoice_number)` does not conflict

### Requirement: Invoice type definitions
The system SHALL export an `InvoiceRecord` interface matching all columns of the `invoice` table, and a `CreateInvoiceData` interface for insertion that includes all fields except `id` (optional, auto-generated UUID if omitted) and `created_at` / `updated_at` (set by the repository). The `status` field SHALL accept string union `'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'ready_for_payment' | 'reconciled'`, and the `match_status` field SHALL accept `'matched' | 'unmatched' | 'not_checked'`.

#### Scenario: CreateInvoiceData omits auto-generated fields
- **WHEN** `CreateInvoiceData` is used to create an invoice
- **THEN** `id` defaults to a generated UUID and `created_at`/`updated_at` are set to the current time by the repository

#### Scenario: InvoiceRecord matches schema
- **WHEN** an invoice row is retrieved from the database
- **THEN** it is mapped to an `InvoiceRecord` with all fields present and correctly typed

### Requirement: InvoiceRepository interface
The system SHALL provide an `InvoiceRepository` interface with methods `create(data: CreateInvoiceData): InvoiceRecord`, `findById(id: string): InvoiceRecord | null`, `findByVendor(vendorId: string): InvoiceRecord[]`, `updateStatus(id: string, status: string): InvoiceRecord`, and `list(): InvoiceRecord[]`. All reads and writes to invoice data MUST go through this interface — no code outside the repository implementation may call the Drizzle client for invoice data.

#### Scenario: Create returns the full record
- **WHEN** `create` is called with valid `CreateInvoiceData`
- **THEN** it returns an `InvoiceRecord` with the generated `id` and timestamps

#### Scenario: findById returns null for unknown id
- **WHEN** `findById` is called with an id not present in the database
- **THEN** it returns `null`

#### Scenario: findByVendor returns vendor-scoped invoices
- **WHEN** `findByVendor` is called with a valid vendor id
- **THEN** it returns only invoices belonging to that vendor, and an empty array if the vendor has no invoices

#### Scenario: updateStatus changes status and updated_at
- **WHEN** `updateStatus` is called with a valid invoice id and a new status value
- **THEN** the invoice's `status` and `updated_at` are updated in the database and the updated record is returned

### Requirement: SQLite implementation singleton
The SQLite implementation SHALL export a module-level constant `invoiceRepository: InvoiceRepository`. All methods SHALL be synchronous (better-sqlite3). The implementation SHALL use the `db` singleton from `src/db/client.ts` and the `invoice` table from `src/db/schema.ts`.

#### Scenario: Singleton exported for direct import
- **WHEN** a consumer imports `invoiceRepository` from `src/repositories/invoice.sqlite.ts`
- **THEN** it receives a shared singleton object implementing `InvoiceRepository`

### Requirement: Supercedes foreign key integrity
The `supersedes_invoice_id` column, when set, SHALL reference an existing `invoice.id`. The repository SHALL validate that a referenced invoice exists on creation and reject the operation if it does not.

#### Scenario: Valid supersedes reference accepted
- **WHEN** `supersedes_invoice_id` references an existing invoice id on creation
- **THEN** the invoice is created successfully with the reference set

#### Scenario: Invalid supersedes reference rejected
- **WHEN** `supersedes_invoice_id` references a non-existent invoice id on creation
- **THEN** the creation fails and no invoice record is persisted
