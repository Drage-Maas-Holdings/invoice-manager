## 1. Vendor Entity

- [x] 1.1 Add `vendor` table to `src/db/schema.ts` (`id`, `name` unique, `passcode_hash`, `contact_email`, `created_at`) per the stack entity pattern
- [x] 1.2 Create `VendorRepository` interface in `src/repositories/vendor.ts` (`create`, `findByName`, `findById`, `list`, `delete`)
- [x] 1.3 Implement it in `src/repositories/vendor.sqlite.ts` and export the `vendorRepository` singleton
- [x] 1.4 Generate and apply the Drizzle migration (`npx drizzle-kit generate && npx drizzle-kit migrate`)

## 2. Vendor Provisioning CLI

- [x] 2.1 Create `scripts/provision-vendor.ts`: prompts for name, contact email, passcode (hidden via the muted-readline pattern from `provision-account.ts`); duplicate-name check via `findByName`; min-12-char passcode; bcrypt cost 12; writes via the repository only
- [x] 2.2 Add `provision-vendor` script to `package.json`
- [x] 2.3 Verify: provision a vendor, confirm bcrypt hash in the row; confirm duplicate name and short passcode both exit with an error (test piped and pty input)

## 3. Vendor Login Gate

- [x] 3.1 Create `POST /api/auth/vendor/login` (`src/pages/api/auth/vendor/login.ts`): validate body, `findByName` (trimmed) + `bcrypt.compare`, set the shared session cookie with `{actor_type: 'vendor', vendor_id}`; generic 401 for unknown name and wrong passcode alike; `Content-Type: application/json` on all responses
- [x] 3.2 Add a temporary probe route under `/api/vendor/` (mirroring `src/pages/api/staff/verify.ts`) to exercise the boundary
- [x] 3.3 Verify with curl: vendor login → cookie → `/api/vendor/**` 200; vendor cookie on `/api/staff/**` → 401; staff cookie on `/api/vendor/**` → 401; logout clears the vendor session

## 4. PO Reference Data

- [x] 4.1 Create `data/purchase-orders.json` with ~5 mock POs (`po_number`, `vendor_name`, `total_amount`, `currency`), including at least one designed to mismatch an invoice on amount/currency for later matching tests
- [x] 4.2 Create `PORepository` interface in `src/repositories/po.ts`: `findByNumber(poNumber): Promise<PurchaseOrder | null>` only, plus the `PurchaseOrder` type
- [x] 4.3 Implement `src/repositories/po.json.ts`: read the file per lookup (path from `PO_DATA_PATH`, default `data/purchase-orders.json`); throw on missing file, invalid JSON, or entries missing required fields; return `null` only for a genuinely absent PO number; export the `poRepository` singleton
- [x] 4.4 Verify: known number returns the PO, unknown returns `null`, missing/malformed file throws (exercise via a scratch script pointing `PO_DATA_PATH` at bad fixtures)

## 5. Verification & Housekeeping

- [x] 5.1 Run the staff auth flow once end-to-end to confirm no regression (login → `/api/staff/**` → logout)
- [x] 5.2 Confirm no route or script imports the Drizzle client directly outside `src/repositories/`, and that `src/lib/session.ts` and `src/middleware.ts` are untouched by this change
- [x] 5.3 Clean up test vendors/accounts created during verification
