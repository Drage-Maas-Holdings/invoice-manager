## Why

The vendor-facing backend exists — passcode login (`POST /api/auth/vendor/login`), invoice submission (`POST /api/vendor/invoices`), and the session/middleware gate — but there is no UI. Vendors currently have no way to log in, submit an invoice, or see the status of their own submissions. PRD Section 6 ("Vendor Portal") and build step 11 call for a passcode-gated portal, behind the gate from step 3, for submission and tracking.

## What Changes

- Add a vendor login page (`/vendor/login`) posting to the existing `POST /api/auth/vendor/login`.
- Add the vendor portal page (`/vendor`) showing the authenticated vendor's own invoices (number, PO reference, amount, currency, due date, `status`, `match_status`) and a submission form posting to the existing `POST /api/vendor/invoices`, including the optional `supersedes_invoice_id` for correcting a rejected invoice.
- The portal page reads invoices server-side via `invoiceRepository.findByVendor(vendorId)`, scoped strictly to the session's own `vendor_id` — a vendor can never see another vendor's invoices.
- Add a logout control posting to the existing `POST /api/auth/logout`.
- **Extend `src/middleware.ts`** to gate the `/vendor` page prefix: an unauthenticated request (or a non-vendor session) to a `/vendor` page is redirected to `/vendor/login` rather than served, while `/vendor/login` itself stays public. Page gating uses a redirect; the existing `/api/**` JSON 401 behavior is unchanged.
- Reuse the existing `Layout.astro`, Tailwind/Flowbite color system, and `ThemeToggle` — no new UI dependencies.

## Capabilities

### New Capabilities

- `vendor-portal`: The passcode-gated vendor UI — login page, own-invoice list with status and match result, and a submission form (including optional supersedes reference), all scoped to the session's vendor.

### Modified Capabilities

- `session-auth`: The route-prefix access enforcement requirement is extended so middleware also guards the `/vendor` **page** prefix, redirecting unauthenticated or wrong-actor requests to `/vendor/login` (page redirect) while keeping the API-route JSON 401 behavior and the public `/vendor/login` page unchanged.

## Impact

- `src/pages/vendor/login.astro`, `src/pages/vendor/index.astro` — new pages.
- `src/middleware.ts` — extended to gate the `/vendor` page prefix with a redirect.
- No changes to the vendor login API, invoice submission API, logout API, repositories, schema, or matching/approval logic. No new dependencies, no migration.
