## Why

The invoice manager currently has identity (staff, vendor), session/auth, and PO reference data, but no invoice records to manage. Without invoices, there is no data to approve, match, or report on. This change introduces the invoice entity — the core domain object — along with automatic header-level PO matching at submission time.

## What Changes

- Add `invoice` Drizzle table with all fields from the PRD data model (id, vendor_id, invoice_number, po_reference, amount, currency, due_date, source_document_path, status, match_status, supersedes_invoice_id, created_at, updated_at)
- Add `InvoiceRepository` interface and SQLite implementation following existing entity patterns (module-level singleton, UUID primary keys, synchronous methods)
- Add API routes for invoice submission: `POST /api/vendor/invoices` (vendor submits own invoices) and `POST /api/staff/invoices` (staff submits on behalf of a vendor)
- Add optional `supersedes_invoice_id` field on submission, allowing a vendor to link a resubmission to a previously rejected invoice
- Add a `matchInvoiceToPO` pure function in the application layer that reads a `PurchaseOrder` via `PORepository.findByNumber` and compares vendor name, total amount, and currency against the invoice
- Run matching synchronously in the same request as invoice submission, setting `match_status` to `matched` or `unmatched`
- Fail invoice submission if `PORepository.findByNumber` throws (data-source fault), rather than persisting the invoice at `not_checked`
- Follow existing middleware pattern: vendor-scoped routes under `/api/vendor/invoices`, staff-scoped routes under `/api/staff/invoices`

## Capabilities

### New Capabilities

- `invoice-entity`: Invoice database table, TypeScript types (InvoiceRecord, CreateInvoiceData), repository interface and SQLite implementation with full CRUD
- `invoice-submission`: API routes for vendor and staff invoice capture (manual field entry plus optional file upload reference), with optional `supersedes_invoice_id`
- `po-matching`: Header-level PO matching logic — a pure `matchInvoiceToPO` function comparing vendor, amount, and currency, invoked at submission time

### Modified Capabilities

<!-- No existing specs require changes — this is purely additive on top of session-auth, staff-accounts, vendor-accounts, and po-lookup. -->

## Impact

- New file: `src/db/schema.ts` — add `invoice` table definition
- New migration: `drizzle/` — one migration file for the `invoice` table
- New files in `src/repositories/`: `invoice.ts` (types + interface), `invoice.sqlite.ts` (implementation)
- New files in `src/pages/api/`: `vendor/invoices.ts` (vendor submission), `staff/invoices.ts` (staff submission)
- New file: `src/lib/matching.ts` — `matchInvoiceToPO` function
- No changes to existing repositories, middleware, session handling, or routes