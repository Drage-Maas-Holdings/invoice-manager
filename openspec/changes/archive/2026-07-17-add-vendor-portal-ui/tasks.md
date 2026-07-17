## 1. Middleware Page Gating

- [x] 1.1 Extend `src/middleware.ts` to gate the `/vendor` page prefix: redirect to `/vendor/login` when there is no valid vendor session, exempting `/vendor/login` itself; leave the existing `/api/staff/**` and `/api/vendor/**` JSON 401 behavior unchanged

## 2. Vendor Login Page

- [x] 2.1 Create `src/pages/vendor/login.astro` using `Layout.astro`, with a name + passcode form that posts to `POST /api/auth/vendor/login`, shows a generic error on failure, and navigates to `/vendor` on success
- [x] 2.2 If an already-authenticated vendor hits `/vendor/login`, send them to `/vendor`

## 3. Vendor Portal Page

- [x] 3.1 Create `src/pages/vendor/index.astro` that reads `invoiceRepository.findByVendor(locals.actor.vendor_id)` server-side and renders a table of the vendor's invoices (number, PO reference, amount, currency, due date, status, match status)
- [x] 3.2 Add the submission form (invoice number, PO reference, amount, currency, optional due date, optional `supersedes_invoice_id`) posting to `POST /api/vendor/invoices`, surfacing API validation errors and refreshing the list on success
- [x] 3.3 Add a logout control posting to `POST /api/auth/logout` and returning to `/vendor/login`; include the `ThemeToggle` component for consistency

## 4. Verification

- [x] 4.1 Run `npm run build` to verify no type errors
- [x] 4.2 Manually verify: unauthenticated `/vendor` redirects to `/vendor/login`; login lands on `/vendor`; the list shows only the logged-in vendor's invoices; a valid submission appears with its match status; an invalid submission shows the API error; logout clears the session and re-gates `/vendor`
