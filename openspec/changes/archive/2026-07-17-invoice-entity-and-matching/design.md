## Context

The invoice manager currently has staff accounts, vendor accounts, session-based authentication with route-prefix access control, and a read-only PO lookup interface backed by a JSON mock file. The next step (PRD build steps 5 & 6) is to add the central invoice entity and header-level PO matching at submission time.

All existing entities follow a consistent pattern: Drizzle SQLite schema, repository interface with a module-level singleton implementation, and API routes under `/api/staff/` or `/api/vendor/` enforced by middleware. This change follows that pattern exactly.

The `invoice` table is the core domain object. Every attribute in the PRD data model must be represented. The `match_status` field is a standing attribute (not a workflow gate), set once at submission and never modified afterward. The `status` field tracks the workflow stage independently.

## Goals / Non-Goals

**Goals:**
- Persist invoices with all PRD-specified fields (id, vendor_id, invoice_number, po_reference, amount, currency, due_date, source_document_path, status, match_status, supersedes_invoice_id, created_at, updated_at)
- Provide an `InvoiceRepository` interface and SQLite implementation following existing entity conventions
- Provide API routes for both vendor self-submission (`POST /api/vendor/invoices`) and staff submission on behalf of a vendor (`POST /api/staff/invoices`)
- Support optional `supersedes_invoice_id` linking on submission
- Implement header-level PO matching as a pure function (`matchInvoiceToPO`) in the application layer, separate from the repository
- Run matching synchronously in the same request as submission, setting `match_status` to `matched` or `unmatched`
- Fail submission entirely if PO data cannot be read (throw from `PORepository` is not caught — it propagates as a 500 error, and the invoice is never persisted)

**Non-Goals:**
- Audit logging (build step 8, not in scope for this change)
- Approval workflow (build step 7)
- Line-item matching
- OCR or file parsing from uploaded documents
- Editing invoices after submission
- Dashboard/reporting (build step 10)
- UI for staff or vendor (build steps 11-12)

## Decisions

### Decision 1: `match_status` and `status` are separate columns, not a combined enum

**Choice:** Two independent columns — `status` (workflow stage) and `match_status` (standing validation result).

**Why:** The PRD explicitly requires this separation. `match_status` is set once at submission and visible through all later stages. Combining them into a single enum would imply exclusivity that doesn't exist (an approved invoice can still show as `unmatched`) and would lose the match result once the invoice progresses. The schema encodes this separation directly.

**Alternatives considered:** A single combined status enum with states like `unmatched_submitted`, `matched_submitted`, `unmatched_approved`, etc. Rejected — combinatorial explosion and it would lose the match result concept after status changes.

### Decision 2: Matching is a pure function, not a repository method

**Choice:** `matchInvoiceToPO(invoice, po: PurchaseOrder | null): 'matched' | 'unmatched'` in `src/lib/matching.ts`.

**Why:** Per the PRD and existing `po-lookup` spec, the `PORepository` is read-only and lookup-only. It returns a PO or null. The comparison logic (vendor name, amount, currency) is separately testable without touching the JSON file or its future ERP replacement. Placing it in `src/lib/` keeps it as a pure utility, not coupled to any repository or API handler.

**Alternatives considered:** Putting comparison in the POST handler inline. Rejected — harder to test independently and mixes I/O with business logic. Putting it in `PORepository`. Rejected — violates the existing contract that the repository is lookup only.

### Decision 3: Invoice submission is a single synchronous flow (persist + match)

**Choice:** The POST handler creates the invoice row, then immediately calls `PORepository.findByNumber` and `matchInvoiceToPO` within the same request. If PO lookup throws, the handler does not catch it — the request fails with 500 and the invoice was never persisted (because Drizzle runs synchronously in better-sqlite3, the insert happens before matching, but the entire handler fails before returning a success response).

**Wait — correction:** The Drizzle insert is synchronous. If we insert first and then PO lookup throws, we'd leave a dangling invoice. Instead, we should perform matching *before* the insert, or wrap both in a transaction.

**Resolution:** Perform PO lookup and matching *before* the Drizzle insert. If PO lookup throws (file missing/malformed), return 500 without inserting. If PO lookup succeeds (returning a PO or null), compute `match_status`, then insert the invoice with the computed `match_status`. The `not_checked` status is never persisted to the database in practice — it exists only as a TypeScript default for schema definition.

**Alternatives considered:** Using Drizzle transactions with rollback. Rejected — simpler to just check first. Inserting at `not_checked` and updating to `matched`/`unmatched`. Rejected — violates PRD requirement that `not_checked` is not an observable state and matching runs synchronously.

### Decision 4: `source_document_path` is a string field, not a file storage abstraction

**Choice:** The field stores a file path or URL string. The API route accepts it as a string — no file upload handling in the route handler itself. File upload (actual multipart handling) is deferred to the UI layer or a later step.

**Why:** The PRD says "Optional file upload (PDF/image) stored as a reference; no OCR." For this change, we store the reference. Astro's built-in form handling can accept `FormData` if needed, but the route handler only needs to persist the path reference. This keeps the change focused on the entity and matching.

### Decision 5: `supersedes_invoice_id` is validated as existing but not checked for rejection status

**Choice:** If `supersedes_invoice_id` is provided, the handler verifies the referenced invoice exists in the database. It does not check whether that invoice has `status: 'rejected'` — the PRD describes it as being set "when a vendor indicates a new submission corrects a previously rejected one," but the field is purely for traceability. Enforcing the referenced invoice must be rejected adds complexity without clear value.

**Why:** The PRD Section 3 states this field "Does not touch matching or approval logic" and is "Purely for traceability/display." Adding a rejection-status gate would create a hard coupling between the submission handler and the approval workflow that doesn't exist yet. The FK constraint ensures referential integrity; the semantic meaning is for humans during audit.

**Alternatives considered:** Checking the referenced invoice's status is `rejected`. Rejected — couples submission to approval logic that hasn't been built yet and adds a guard that the PRD doesn't require.

### Decision 6: Initial `status` on submission is always `submitted`

**Choice:** The creation handler always sets `status` to `submitted`. The transition to `pending_approval` happens after matching (in the same request, but matching doesn't block it — both matched and unmatched go to `pending_approval`).

**Wait — correction:** Per the PRD lifecycle: `submitted → (matching) → pending_approval`. The matching runs immediately after submission in the same request. So the insert should already set `status` to `pending_approval`, not `submitted`, since matching completes before the response is returned.

**Resolution:** Insert the invoice with `status: 'pending_approval'` and the computed `match_status`. The `submitted` state in the lifecycle is conceptual — from the API consumer's perspective, the invoice is immediately in `pending_approval` after a successful submission. There is no separate "submitted and awaiting matching" state observable to any actor.

### Decision 7: `invoice_number` uniqueness

**Choice:** `invoice_number` is enforced as unique within the scope of a vendor (composite unique constraint on `(vendor_id, invoice_number)`), not globally unique.

**Why:** Different vendors can legitimately use the same invoice number format. Enforcing global uniqueness would create false conflicts. The composite constraint correctly reflects the business domain: a vendor should not submit two invoices with the same number.

### Decision 8: Route handlers trust middleware for authorization — no redundant checks

**Choice:** Route handlers do not duplicate the middleware's `actor_type` guard. The middleware at `src/middleware.ts` enforces `/api/vendor/**` for vendor sessions and `/api/staff/**` for staff sessions before any handler runs. Handlers may assume the correct `actor_type` is present in `context.locals.actor` and access `actor.vendor_id` / `actor.staff_id` directly, matching the pattern established by `src/pages/api/staff/verify.ts`.

**Why:** The middleware is the single enforcement point. Duplicating the check in each handler is harmless but inconsistent — it obscures the architecture's trust boundary and creates a pattern future routes may copy. The middleware's prefix-based routing already guarantees that a vendor session reaching `/api/vendor/invoices` has `actor_type: 'vendor'`; re-checking it inside the handler adds noise with no security benefit.

**Alternatives considered:** Checking `actor_type` in every handler. Rejected — inconsistent with the project's existing middleware-only pattern (verify.ts, staff login's own routes, logout) and creates unnecessary coupling between handler logic and auth concerns.

### Decision 9: Unit test coverage for pure matching logic

**Choice:** The `matchInvoiceToPO` function in `src/lib/matching.ts` SHALL have dedicated unit tests covering all six code paths: no PO found, vendor name mismatch, amount mismatch beyond tolerance, currency mismatch, amount within tolerance boundary, and all-fields-match success.

**Why:** The function is pure (no I/O, no side effects), takes trivial inputs, and has six distinct outcomes. It is the only logic in the system where a business rule (header-level PO matching) is expressed as a pure function, making it uniquely well-suited for fast, deterministic vitest unit tests without mocking, a database, or the filesystem. The `po-matching` spec already describes it as "independently testable" but the current verification section (section 7) only covers manual curl-based end-to-end tests. Leaving a pure, multi-branch function untested is a coverage gap that will compound when invoice matching is extended (line items, partial matches, etc.).

**Alternatives considered:** Coverage only through the existing curl-based E2E tests. Rejected — E2E tests require a running server, a provisioned vendor, and PO data; they test the integration path, not the edge cases of the matching function itself. A unit test can exercise all six branches in milliseconds with zero setup.

**Choice:** `invoice_number` is enforced as unique within the scope of a vendor (composite unique constraint on `(vendor_id, invoice_number)`), not globally unique.

**Why:** Different vendors can legitimately use the same invoice number format. Enforcing global uniqueness would create false conflicts. The composite constraint correctly reflects the business domain: a vendor should not submit two invoices with the same number.

## Risks / Trade-offs

- **[Risk]** PO lookup before insert means the PO file must be readable on every submission request. If the JSON file is large, this adds I/O latency. → **Mitigation:** The mock JSON file is small (5 POs). A future ERP-backed implementation would have its own performance characteristics. The architecture (repository interface) allows swapping without changing the matching or submission logic.
- **[Risk]** No audit logging in this change means invoice creation and matching are not audited until build step 8. → **Mitigation:** Explicitly scoped out. The audit module will be wired into existing handlers in a dedicated change; the submission and matching logic won't need structural changes.
- **[Trade-off]** `supersedes_invoice_id` validation only checks existence, not rejection status. → **Accepted:** The PRD frames this as a traceability concern, not a workflow gate.

## Open Questions

<!-- None — all design decisions are resolved by the PRD and existing conventions. -->