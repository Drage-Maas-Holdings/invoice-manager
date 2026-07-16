# Invoice Manager - Product Requirements Document (MVP)

Module: `invoice-manager` (Corporate Suite)
Status: Draft for build
Stack: per `Stack Reference` (Astro v7 server, SQLite + Drizzle, repository-interface pattern, no framework-level auth)

## 1. Purpose

Invoice Manager is a single-function module covering invoice capture, validation against purchase orders, single-step approval, and basic reporting for one company's accounts payable process. It is built as a standalone, compartmentalized unit that can later be combined into a larger suite without requiring a rebuild of its core data model.

## 2. Actors

| Actor | Identity mechanism | Capabilities |
|---|---|---|
| Staff (internal) | Individual email + hashed password, provisioned via CLI tool. Signed session cookie after login, payload `{actor_type: 'staff', staff_id}` | View invoices, run/confirm matching, approve or reject, mark reconciled, view dashboard |
| Vendor | Shared passcode per vendor (hashed at rest), no individual accounts. Same signed-cookie mechanism as staff, payload `{actor_type: 'vendor', vendor_id}` | Submit invoices, view status of own submissions only |
| System | No identity, logged as `system` in audit trail | Runs header-level PO matching on submission |

Staff and vendor sessions share one signing key and one piece of session-reading logic; the only difference is the `actor_type` in the payload. Enforcement is not left to individual route handlers to remember. `src/middleware.ts` (the one routing hook Stack Reference permits) decodes the session once per request, attaches the resolved actor to `context.locals`, and enforces access by route path convention: staff-only actions live under `/api/staff/**`, vendor-scoped actions under `/api/vendor/**`. A request to a staff-prefixed route without a staff session is rejected in middleware before any handler runs. This turns "every route must remember to check `actor_type`" into a structural guarantee instead of a convention.

## 3. Key Decisions (confirmed during scoping)

| Decision | Resolution | Reason / accepted tradeoff |
|---|---|---|
| Auth vs. no-auth stack rule | Vendors use a shared, hashed passcode per vendor. Staff use individual hashed credentials, provisioned via the standard Account Provisioning CLI tool (now part of `Stack Reference`, not specific to this module). | Satisfies the vendor portal and approval-step requirements without building a full auth framework. Both paths swap out cleanly when the module moves to PocketBase; the CLI tool becomes the account-migration path. |
| Vendor passcode is shared, not individual | Accepted | Simpler for MVP; means audit trail cannot distinguish which person at a vendor submitted an invoice, only that it came from that vendor. Documented as a known gap in Section 9. |
| Purchase order data ownership | Invoice Manager does not own PO data. A `PORepository` interface reads from a mock JSON file now, swapped for an ERP-backed implementation later. | Keeps the module compartmentalized; Procurement is a separate future module. Matches the existing repository-interface pattern used for every other entity. |
| Matching granularity | Header-level only: PO number, vendor, total amount, currency. No line-item matching. | Line-item (three-way) matching is explicitly out of scope for this release. |
| Audit trail attribution | Staff actions are attributed to the authenticated staff account from the session. Vendor actions are attributed to the vendor record (not an individual person). System actions are attributed to `system`. Mechanically implemented as the FK + snapshot design below, not a plain string. | Individual staff credentials exist specifically to make this attribution meaningful; a shared credential would have undermined it. |
| Tenancy | Single tenant for this release. | Multi-tenant is a stated future goal; entity schemas should not assume a single global dataset in a way that blocks adding a `tenant_id` column later, but no tenant logic is built now. |
| Match result vs. workflow stage | `match_status` (`matched` / `unmatched` / `not_checked`) is a separate field from `status`, set once at submission and left untouched afterward. | Matching is a standing attribute, not a workflow gate; both matched and unmatched invoices proceed to `pending_approval`. Keeping it in the same enum as `status` would imply an exclusivity it doesn't have and would lose the result once the invoice moves on. |
| Rejection terminality | `rejected` is terminal for that invoice record. No transition back to `submitted`, no in-place edit. A vendor who needs to correct a rejected invoice submits a new invoice as a new record. | Lowest-complexity option consistent with a single approval step and no dispute workflow in scope. Avoids versioning questions (field history, audit context reset) that an edit-and-resubmit flow would raise without adding value this release doesn't otherwise need. |
| `PORepository` interface shape | Read-only interface, e.g. `findByNumber(poNumber): Promise<PurchaseOrder \| null>`. No `create`/`update`/`delete` methods. | Invoice Manager never writes PO data, now or under a future ERP-backed implementation. Giving it full CRUD parity with `staff`/`vendor`/`invoice`/`audit_log` to match their shape would add methods that either throw or silently no-op, advertising capability that doesn't exist. The repository-interface principle is about routes never touching the store directly, not literal method-set parity across every entity. |
| Vendor session mechanism | Vendors use the same signed-cookie session mechanism as staff, distinguished only by `actor_type` in the payload (see Section 2). | Avoids building and maintaining two independent session implementations for the same problem (persisting an identity across requests after a credential check). |
| Audit log actor reference | `audit_log` stores nullable `staff_id` and `vendor_id` foreign keys (only one populated per `actor_type`, both null for `system`), plus a denormalized `actor_label` text snapshot captured at the time of the action. | A bare string column can't be joined or queried reliably, and goes stale or ambiguous if a vendor is renamed or a staff email changes. The FK gives referential integrity and query support; the snapshot preserves what was true at the time of the action, since an audit trail must not silently change meaning if the underlying staff or vendor record is later edited. |
| Staff/vendor access enforcement | Enforced in `src/middleware.ts` by route path convention (`/api/staff/**`, `/api/vendor/**`), not by each route handler independently checking `actor_type`. | A per-route convention means one missed check is a privilege boundary failure, not a normal bug. Centralizing in the one sanctioned routing hook makes the boundary structural instead of something every handler has to remember. |
| `not_checked` as a real state | `not_checked` is schema-default hygiene only; matching runs synchronously immediately after submission (a local file read, no realistic timeout), so it is not expected to be an observed state in any UI. If the `PORepository` read itself fails (malformed or missing mock file), invoice submission fails outright with an error rather than persisting the invoice at `not_checked`. | A system fault (bad data source) is a different kind of problem than a business outcome (no PO match found) and should not be allowed to masquerade as the latter. |
| Matching logic location | `PORepository.findByNumber` only looks up a PO by number and returns it or `null`. Comparing the returned PO's vendor, amount, and currency against the invoice is a separate pure function (e.g. `matchInvoiceToPO(invoice, po)`), called by the application layer, not implemented inside the repository. | Keeps the repository a lookup only, consistent with its narrow read-only interface, and keeps the comparison logic independently testable without touching the JSON file or its future ERP replacement. |
| Rejection trail correlation | `invoice` carries an optional, nullable, self-referencing `supersedes_invoice_id`, populated only if a vendor references the invoice they are correcting when resubmitting after a rejection. | Cheap to add now (one nullable column, one optional field on the resubmission form), does not touch matching or approval logic, and avoids relying on fuzzy correlation by `invoice_number` or date during an audit, which breaks if either changes between attempts. |

## 4. Data Model

All entities follow the Stack Reference entity pattern: Drizzle table, repository interface + SQLite implementation, API routes calling the repository only.

**staff**
- `id`, `first_name`, `last_name`, `email` (unique), `password_hash`, `created_at`
- Provisioned only via the standard Account Provisioning CLI tool (per `Stack Reference`), never through the application UI.

**vendor**
- `id`, `name`, `passcode_hash`, `contact_email`, `created_at`

**invoice**
- `id`, `vendor_id`, `invoice_number`, `po_reference` (string, matched against `PORepository`), `amount`, `currency`, `due_date`, `source_document_path` (uploaded file reference, no OCR), `status`, `match_status`, `supersedes_invoice_id` (nullable, self-referencing FK to `invoice.id`), `created_at`, `updated_at`
- `status` values (workflow stage): `submitted`, `pending_approval`, `approved`, `rejected`, `ready_for_payment`, `reconciled`. `rejected` is terminal; no transition back to `submitted`.
- `match_status` values (standing validation result, set once at submission): `matched`, `unmatched`, `not_checked`. `not_checked` is a schema default, not an expected observable state; see Section 3.
- `supersedes_invoice_id` is optional and set only when a vendor indicates a new submission corrects a previously rejected one. Purely for traceability/display; does not affect matching or approval behavior.

**audit_log**
- `id`, `invoice_id`, `actor_type` (`staff` / `vendor` / `system`), `staff_id` (nullable FK to `staff.id`), `vendor_id` (nullable FK to `vendor.id`), `actor_label` (denormalized text snapshot: staff email or vendor name at time of action, `system` for system actions), `action`, `notes`, `created_at`
- Exactly one of `staff_id` / `vendor_id` is populated depending on `actor_type`; both null when `actor_type` is `system`.

**PO reference data (not a Drizzle table)**
- Read-only, sourced from a mock JSON file via `PORepository` interface.
- Minimum fields per PO: `po_number`, `vendor_name`, `total_amount`, `currency`.
- Interface is intentionally narrow and read-only: `findByNumber(poNumber): Promise<PurchaseOrder | null>`. No write methods; the ERP owns writes when that implementation replaces the mock JSON file, this module only ever reads.
- The repository does not compare fields. Matching (vendor/amount/currency comparison between the invoice and the returned PO) is a separate pure function in the application layer; see Section 3, "Matching logic location."

## 5. Invoice Lifecycle

```
status:       submitted -> pending_approval -> approved / rejected -> ready_for_payment -> reconciled
match_status: not_checked -> matched / unmatched                     (set once, stands alongside status)
```

- **submitted**: vendor uploads a document and/or enters invoice fields manually, or staff enters on the vendor's behalf. `match_status` starts at `not_checked`, a schema default that is not expected to be observed since matching runs synchronously in the same request. If the vendor is correcting a previously rejected invoice, they may optionally set `supersedes_invoice_id` to that invoice's id.
- **matching**: immediately after submission, system compares `po_reference`, vendor, amount, and currency against the `PORepository` and sets `match_status` to `matched` or `unmatched`, via a pure comparison function operating on what `PORepository.findByNumber` returns (the repository itself does no comparison). This is not a workflow gate; it does not block progression to `pending_approval` and is not itself a `status` value. It remains visible on the invoice through every later stage. If the `PORepository` read fails outright, submission fails with an error rather than leaving the invoice at `not_checked`.
- **pending_approval**: staff reviews (matched or unmatched, both visible) and either approves or rejects.
- **approved**: single approval step is sufficient; no configurable chains.
- **rejected**: terminal. No transition back to `submitted`, no in-place edit. A vendor needing to correct a rejected invoice submits a new invoice as a new record, optionally linked via `supersedes_invoice_id`; the rejected record and its reason remain unchanged in the audit trail.
- **ready_for_payment**: status marker only, no payment initiation or banking integration.
- **reconciled**: staff manually marks the invoice reconciled once payment has occurred outside the system.

Every `status` transition, and the matching step, writes an `audit_log` row.

## 6. Functional Requirements

**Invoice Capture**
- Manual entry of all invoice fields.
- Optional file upload (PDF/image) stored as a reference; no OCR or data extraction from the file.
- Available to both vendors (own submissions) and staff (on behalf of a vendor).

**Validation**
- Header-level two-way match against the `PORepository`: PO number, vendor, total amount, currency.
- Result recorded in `match_status`, a standing attribute separate from workflow `status`. Mismatches are flagged, not auto-rejected, and remain visible through later stages.
- Comparison logic lives in the application layer, not the repository; `PORepository` only looks up a PO by number.

**Approval Workflow**
- Single approval step, performed by an authenticated staff account.
- Approve or reject, with an optional note stored in `audit_log`.

**Payment Handling**
- Status tracking only (`ready_for_payment`).
- No payment initiation, no banking or ERP integration.

**Reconciliation**
- Manual status change to `reconciled` by staff.
- No automated sync with an external ledger in this release.

**Compliance & Audit**
- Every state-changing action recorded in `audit_log` with actor, action, and timestamp.
- No anomaly detection, no configurable retention policy beyond basic storage.

**Vendor Portal**
- Passcode-gated view scoped to a single vendor's own invoices.
- Submit new invoices, view status of existing ones. When resubmitting after a rejection, optionally reference the invoice being corrected via `supersedes_invoice_id`.
- No messaging, negotiation, or dispute features.

**Reporting & Visibility**
- Dashboard showing total outstanding liabilities, bucketed by due date (overdue / this week / this month / later).
- No predictive forecasting model, only bucketed sums of existing data.

## 7. Non-Functional Requirements

- Vendor passcodes and staff passwords are hashed at rest; plaintext credentials are never stored in configuration files, environment variables, or the database.
- Staff accounts are provisioned only via the Account Provisioning CLI tool defined in `Stack Reference` (first name, last name, email, password), writing through the same repository interface as the `staff` entity; there is no self-service account creation, no in-app signup, and no password reset flow.
- Session handling is a signed cookie issued at login; no third-party auth provider is introduced at this stage.
- All entity access goes through a repository interface, including the PO reference data, so later swaps (SQLite to PocketBase, JSON file to ERP) do not require changes to API routes. The `PORepository` interface is read-only; it is not required to mirror the CRUD shape of other repositories.
- Staff and vendor sessions share one signed-cookie mechanism and one signing key, distinguished by `actor_type` in the payload, rather than two separate implementations.
- Access control for staff-only versus vendor-scoped routes is enforced in `src/middleware.ts` by route path convention, not by individual route handlers checking `actor_type` independently.
- `audit_log` entries are attributed by nullable foreign key (`staff_id` or `vendor_id`) for referential integrity and querying, plus a denormalized `actor_label` snapshot so historical entries remain accurate if the underlying staff or vendor record is later edited.
- Schema should avoid assumptions that would block adding a `tenant_id` column later, without implementing multi-tenant logic now.

## 8. Out of Scope (Future Releases)

- AI/OCR extraction and email intake for invoice capture
- Three-way matching (line-item / receipt level validation)
- Configurable, multi-step approval chains
- Payment initiation and banking/ERP integration
- Automated reconciliation with ERP (real-time sync)
- Fraud detection and advanced compliance logging
- Expanded vendor portal features beyond submission and tracking
- Editing or resubmitting a rejected invoice in place (vendor submits a new invoice record instead)
- Individual vendor-side accounts (currently shared passcode per vendor)
- Rate limiting / lockout on passcode and staff login
- Multi-tenant data separation

## 9. Known Gaps Accepted for This Release

- Shared vendor passcode means no audit distinction between individuals at the same vendor.
- No login attempt rate limiting on either staff or vendor gates.
- PO matching quality is only as good as the manually maintained mock JSON file; no validation against a live procurement source.

## 10. Build Order

1. Scaffold module against the standard stack (`astro-module-scaffold`).
2. `staff` entity, schema, repository, Account Provisioning CLI tool (first name, last name, email, password), login route, shared signed-cookie session mechanism (payload discriminated by `actor_type`), `src/middleware.ts` session decoding and route-prefix access enforcement (`/api/staff/**`, `/api/vendor/**`).
3. `vendor` entity, schema, repository, passcode hashing, vendor login gate reusing the session mechanism from step 2 with `actor_type: 'vendor'`.
4. Mock PO JSON file and `PORepository` interface (read-only, lookup only, no comparison logic).
5. `invoice` entity, schema, repository, API routes for capture (manual entry + upload reference, optional `supersedes_invoice_id`).
6. Header-level matching: a pure `matchInvoiceToPO` function in the application layer, calling `PORepository.findByNumber` and comparing the result against the invoice, setting `match_status`.
7. Approval workflow, gated behind staff session.
8. `audit_log` entity, repository, and wiring into every state-changing action from steps 5-7.
9. Manual reconciliation status change.
10. Dashboard/reporting queries over `invoice`.
11. Vendor portal UI (submission + tracking), behind the passcode gate from step 3.
12. Staff UI (list, review, approve, reconcile), behind the login from step 2.

This order exists so no step depends on an entity or repository that hasn't been built yet, and so the audit log can be wired in from the start rather than retrofitted.