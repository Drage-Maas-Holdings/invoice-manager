## Context

Step 2 shipped the shared session mechanism with the vendor payload variant (`{actor_type: 'vendor', vendor_id, exp}`) already defined in `src/lib/session.ts`, and `src/middleware.ts` already enforcing `/api/vendor/**`. This change fills in the two missing foundations before invoice capture: the vendor identity itself (PRD step 3) and PO reference data access (PRD step 4).

Constraints: repository-interface pattern for all data access; `PORepository` is deliberately read-only and lookup-only (PRD Section 3 decisions); no self-service account creation; passcodes hashed at rest, never in config or env.

## Goals / Non-Goals

**Goals:**
- `vendor` table, repository, migration; CLI provisioning for vendors.
- Vendor login route issuing the existing session cookie with `actor_type: 'vendor'`.
- `data/purchase-orders.json` + `PORepository` interface + JSON-file implementation.
- Verify the middleware `/api/vendor/**` boundary end-to-end now that a vendor session can actually exist.

**Non-Goals:**
- Invoice entity, matching logic, or `matchInvoiceToPO` (steps 5–6). The PO repository does no comparison.
- Individual vendor-side accounts, rate limiting, dispute features (PRD out of scope).
- Any change to the session module, middleware, staff entity, or logout route.

## Decisions

**Vendor `name` is unique and is the login identifier.** With a shared passcode per vendor, the login form needs a way to say *which* vendor; `name` + passcode is the simplest credential pair that doesn't expose internal ids. The PRD doesn't mark `name` unique, but two vendors with the same name would make login ambiguous and audit attribution meaningless, so uniqueness is a safe strengthening. Lookup is exact-match, case-sensitive on the stored name (normalize with `.trim()` only; vendor names are proper nouns, unlike emails).

**Vendor provisioning is a CLI script, mirroring staff.** The PRD specifies the Account Provisioning CLI for staff only and is silent on vendor creation; the vendor portal explicitly has no signup. A `scripts/provision-vendor.ts` (name, contact email, hidden passcode prompt, bcrypt cost 12, min 12 chars, duplicate-name check) keeps provisioning consistent, avoids building staff-facing vendor CRUD this release doesn't require, and reuses the readline pattern (async iterator + muted output) that already survived the Node 24 piped-stdin issue in the staff CLI.

**`VendorRepository` shape:** `create`, `findByName`, `findById`, `list`, `delete` — same CRUD shape as staff, singleton `vendorRepository` in `src/repositories/vendor.sqlite.ts`.

**Vendor login lives at `POST /api/auth/vendor/login`.** Symmetric with `/api/auth/staff/login`, outside the protected prefixes. Same generic-401 discipline (unknown name and wrong passcode return identical responses), same cookie via the existing `createSessionToken`/`COOKIE_OPTIONS`. Logout is already actor-agnostic — no new route.

**`PORepository` is a separate narrow interface, not the entity CRUD shape.** Per the PRD's explicit decision: `findByNumber(poNumber: string): Promise<PurchaseOrder | null>` and nothing else. `PurchaseOrder` = `{ po_number, vendor_name, total_amount, currency }`. The JSON implementation (`src/repositories/po.json.ts`) reads `data/purchase-orders.json` on each lookup (no caching — the file is tiny and staleness questions disappear), path configurable via `PO_DATA_PATH` env with `data/purchase-orders.json` default.

**Read failure throws; `null` means "not found" only.** If the file is missing or malformed JSON, `findByNumber` throws. Per the PRD, a system fault must not masquerade as a business outcome — step 5's submission flow will turn that exception into a failed submission, never a `not_checked` invoice. Rows in the file missing required fields are treated as malformed (throw), not skipped.

**Mock data ships with plausible fixtures.** ~5 POs referencing the kinds of vendor names used in dev, including at least one that will *mismatch* on amount/currency in step 6 testing.

## Risks / Trade-offs

- [Shared vendor passcode can't distinguish individuals] → PRD-accepted gap (Section 9); audit trail attributes to the vendor record.
- [No rate limiting on the vendor gate] → PRD-accepted gap for this release.
- [Reading the JSON file per lookup] → Trivial cost at MVP scale; avoids cache-invalidation logic that the ERP-backed implementation would discard anyway.
- [`name` as login identifier means renaming a vendor changes their credential] → Acceptable now; vendors are provisioned and renamed by the operator running the CLI, who can communicate the change. The future suite auth layer replaces this flow entirely.
- [Case-sensitive name login could confuse users] → Mitigated by exact provisioning control; revisit if it bites in practice.

## Migration Plan

1. Add `vendor` table, generate + apply Drizzle migration (additive only).
2. Add `data/purchase-orders.json` and the PO repository (no DB involvement).
3. Provision a test vendor via CLI; verify login → `/api/vendor/**` boundary → logout with curl.
Rollback: revert the change; migration only adds the `vendor` table.

## Open Questions

None — PRD Sections 3–4 pin the interface shapes and failure semantics.
