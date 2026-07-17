## 1. Invoice Database Schema

- [x] 1.1 Add `invoice` table to `src/db/schema.ts` with all columns: `id`, `vendor_id`, `invoice_number`, `po_reference`, `amount`, `currency`, `due_date`, `source_document_path`, `status`, `match_status`, `supersedes_invoice_id`, `created_at`, `updated_at`, plus composite unique constraint on `(vendor_id, invoice_number)` and self-referencing FK on `supersedes_invoice_id`
- [x] 1.2 Generate Drizzle migration with `drizzle-kit generate` and verify the SQL output

## 2. Invoice Type Definitions and Repository Interface

- [x] 2.1 Create `src/repositories/invoice.ts` with `InvoiceRecord` interface, `CreateInvoiceData` interface, `InvoiceStatus` type union (`'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'ready_for_payment' | 'reconciled'`), and `MatchStatus` type union (`'matched' | 'unmatched' | 'not_checked'`)
- [x] 2.2 Define `InvoiceRepository` interface with methods: `create(data: CreateInvoiceData): InvoiceRecord`, `findById(id: string): InvoiceRecord | null`, `findByVendor(vendorId: string): InvoiceRecord[]`, `updateStatus(id: string, status: InvoiceStatus): InvoiceRecord`, `list(): InvoiceRecord[]`

## 3. Invoice Repository Implementation

- [x] 3.1 Create `src/repositories/invoice.sqlite.ts` with module-level `invoiceRepository` singleton implementing `InvoiceRepository`
- [x] 3.2 Implement `create()` — generates UUID if not provided, sets `created_at`/`updated_at` to `new Date()`, validates `supersedes_invoice_id` exists if provided, uses `db.insert(invoice).values(...)`
- [x] 3.3 Implement `findById()` — returns mapped `InvoiceRecord` or `null`
- [x] 3.4 Implement `findByVendor()` — returns invoices filtered by `vendor_id`, ordered by `created_at` descending
- [x] 3.5 Implement `updateStatus()` — updates `status` and `updated_at`, returns updated record
- [x] 3.6 Implement `list()` — returns all invoices ordered by `created_at` descending
- [x] 3.7 Add `rowToRecord()` helper mapping Drizzle row types to `InvoiceRecord`

## 4. PO Matching Function

- [x] 4.1 Create `src/lib/matching.ts` with `matchInvoiceToPO(invoiceFields: { vendor_name: string; amount: number; currency: string }, po: PurchaseOrder | null): 'matched' | 'unmatched'`
- [x] 4.2 Implement case-insensitive vendor name comparison
- [x] 4.3 Implement floating-point amount comparison with 0.01 tolerance
- [x] 4.4 Implement case-insensitive currency comparison
- [x] 4.5 Return `'unmatched'` when PO is `null` (no PO found)
- [x] 4.6 Write vitest unit tests for `matchInvoiceToPO` covering all 6 code paths: no PO, vendor mismatch, amount mismatch, currency mismatch, tolerance boundary, all-match success; runnable without DB/filesystem/network

## 5. Vendor Invoice Submission Route

- [x] 5.1 Create `src/pages/api/vendor/invoices.ts` with `POST` handler (gated by middleware for vendor sessions)
- [x] 5.2 Read `vendor_id` from `context.locals.actor.vendor_id` (not from request body)
- [x] 5.3 Parse and validate request body: require `invoice_number`, `po_reference`, `amount` (positive number), `currency`; optional `due_date`, `source_document_path`, `supersedes_invoice_id`
- [x] 5.4 Look up vendor name via `vendorRepository.findById()` for matching
- [x] 5.5 Call `poRepository.findByNumber()` and `matchInvoiceToPO()` *before* persisting — compute `match_status`
- [x] 5.6 Create invoice via `invoiceRepository.create()` with `status: 'pending_approval'` and computed `match_status`
- [x] 5.7 Return 201 with the created invoice record as JSON
- [x] 5.8 Remove redundant `actor_type` check from vendor invoices handler — middleware already enforces `/api/vendor/**` for vendor sessions; trust `context.locals.actor.vendor_id` directly

## 6. Staff Invoice Submission Route

- [x] 6.1 Create `src/pages/api/staff/invoices.ts` with `POST` handler (gated by middleware for staff sessions)
- [x] 6.2 Parse and validate request body: require `vendor_id`, `invoice_number`, `po_reference`, `amount` (positive number), `currency`; optional `due_date`, `source_document_path`, `supersedes_invoice_id`
- [x] 6.3 Validate vendor exists via `vendorRepository.findById()` — return 400 if not found
- [x] 6.4 Look up vendor name for matching
- [x] 6.5 Call `poRepository.findByNumber()` and `matchInvoiceToPO()` *before* persisting — compute `match_status`
- [x] 6.6 Create invoice via `invoiceRepository.create()` with `status: 'pending_approval'` and computed `match_status`
- [x] 6.7 Return 201 with the created invoice record as JSON
- [x] 6.8 Remove redundant `actor_type` check from staff invoices handler — middleware already enforces `/api/staff/**` for staff sessions; trust `context.locals.actor` directly

## 7. Verification

- [x] 7.1 Start dev server and verify migration applies without errors
- [x] 7.2 Test vendor submission: provision a vendor, login, POST to `/api/vendor/invoices`, verify `match_status` and `status` in response
- [x] 7.3 Test staff submission: login as staff, POST to `/api/staff/invoices` with a valid `vendor_id`, verify response
- [x] 7.4 Test duplicate invoice number for same vendor returns error
- [x] 7.5 Test submission with invalid `supersedes_invoice_id` returns 400
- [x] 7.6 Test submission with missing PO file returns 500 and no invoice persisted
- [x] 7.7 Test auth gating: unauthenticated and wrong-actor-type requests to both routes return 401
- [x] 7.8 Run `npm run lint` and verify no errors