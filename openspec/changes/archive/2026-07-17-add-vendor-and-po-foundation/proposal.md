## Why

Build step 2 (staff auth foundation) is implemented, merged into `main`, and archived. The next PRD build steps unblock invoice capture: step 3 gives vendors an identity (entity + shared hashed passcode + login gate reusing the existing session mechanism), and step 4 gives the module read-only access to purchase-order reference data via the `PORepository` interface. Step 5 (invoice entity) depends on both.

## What Changes

- Add the `vendor` Drizzle table (`id`, `name` unique, `passcode_hash`, `contact_email`, `created_at`) with repository interface + SQLite implementation, per the stack entity pattern.
- Add a vendor provisioning CLI (`npm run provision-vendor`): name, contact email, passcode (hidden prompt, bcrypt cost 12, min 12 chars), writing through the vendor repository — same no-self-service rule as staff accounts.
- Add `POST /api/auth/vendor/login`: vendor name + passcode, verified with bcrypt, issuing the existing signed session cookie with payload `{actor_type: 'vendor', vendor_id}`. The session module, cookie attributes, logout route, and middleware enforcement from step 2 are reused **unchanged** — the vendor payload variant and `/api/vendor/**` middleware rule already exist.
- Add `data/purchase-orders.json` (mock PO reference data) and a read-only `PORepository` interface: `findByNumber(poNumber): Promise<PurchaseOrder | null>`. Lookup only — no write methods, no comparison logic (matching is a step-6 pure function). A malformed or missing data file throws; `null` strictly means "no PO with that number".

## Capabilities

### New Capabilities
- `vendor-accounts`: the vendor entity, its repository, and CLI-only vendor provisioning with the shared per-vendor passcode hashed at rest.
- `po-lookup`: the read-only `PORepository` interface over mock JSON purchase-order reference data.

### Modified Capabilities
- `session-auth`: adds the vendor login gate requirement (`POST /api/auth/vendor/login` issuing an `actor_type: 'vendor'` session). The session mechanism, logout, and middleware enforcement requirements are unchanged.

## Impact

- `src/db/schema.ts`: new `vendor` table; Drizzle migration.
- `src/repositories/`: `vendor.ts` + `vendor.sqlite.ts`; `po.ts` + `po.json.ts` (JSON-file implementation).
- `src/pages/api/auth/vendor/login.ts`: new route (public prefix, same generic-401 discipline as staff login).
- `scripts/provision-vendor.ts`, `package.json` (new script), `data/purchase-orders.json`.
- No changes to `src/lib/session.ts`, `src/middleware.ts`, or the staff entity — step 2's design made this step additive by construction.
- Downstream: step 5 (invoice capture) consumes the vendor session and `supersedes` flow; step 6 (matching) consumes `PORepository.findByNumber`.
