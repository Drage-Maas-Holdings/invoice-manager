## 1. Design System Foundation

- [x] 1.1 Add semantic status-colour tokens to `src/styles/global.css` for invoice `status` (`submitted`/`pending_approval`, `approved`/`ready_for_payment`, `reconciled`, `rejected`) and `match_status` (`matched`, `unmatched`, `not_checked`), each with an explicit light and dark value, following the existing `--color-*` / `.dark` convention
- [x] 1.2 Add shared UI utilities/classes for the design language: KPI/summary card, data-table (quiet header, hairline row separators, right-aligned numerics, hover state), status pill (muted tinted background + readable foreground + always-visible label), and a page shell with a constrained max-width content column and generous spacing
- [x] 1.3 Establish the typographic hierarchy (page title / section heading / body / caption) and apply tabular numerics to money and ID columns; set shared defaults in `src/layouts/Layout.astro` where appropriate
- [x] 1.4 Add a small inline-SVG icon set (actions, statuses, nav) at a uniform stroke weight and size — no icon-font or package dependency

## 2. Middleware Page Gating

- [x] 2.1 Extend `src/middleware.ts` to gate the `/staff` page prefix: redirect to `/staff/login` when there is no valid staff session, exempting `/staff/login` itself; leave the existing `/api/**` JSON 401 and `/vendor` page-redirect behavior unchanged

## 3. Staff Login Page

- [x] 3.1 Create `src/pages/staff/login.astro` using `Layout.astro` and the design-system primitives, with an email + password form that posts to `POST /api/auth/staff/login`, shows a generic error on failure, and navigates to `/staff` on success
- [x] 3.2 If an already-authenticated staff member hits `/staff/login`, send them to `/staff`

## 4. Staff Invoice List

- [x] 4.1 Create `src/pages/staff/index.astro` that reads `invoiceRepository.list()` server-side, resolves vendor names via `vendorRepository`, and renders the shared data table (vendor, invoice number, PO reference, amount, currency, due date, status, match status) with status pills and each row linking to `/staff/invoices/[id]`
- [x] 4.2 Add the outstanding-liabilities summary computed with `bucketOutstandingLiabilities` (overdue / this week / this month / later / undated) as a row of KPI summary cards
- [x] 4.3 Add a logout control posting to `POST /api/auth/logout` and returning to `/staff/login`; include the `ThemeToggle` component

## 5. Invoice Detail & Review

- [x] 5.1 Create `src/pages/staff/invoices/[id].astro` reading `invoiceRepository.findById(id)` (404 on unknown id) and `auditLogRepository.findByInvoice(id)`, rendering the invoice fields and the audit trail (actor label, action, note, timestamp) in chronological order, using the design-system typography, cards, and status pills
- [x] 5.2 Render only the status-appropriate action controls: `pending_approval` → Approve / Reject (each with optional note) posting to the approve/reject routes; `approved` → Mark ready for payment; `ready_for_payment` → Mark reconciled; terminal (`rejected`/`reconciled`) → none
- [x] 5.3 Wire the action controls via inline fetch to the corresponding `/api/staff/invoices/[id]/*` routes, surfacing the API error on failure and reloading to reflect the new status and audit entry on success

## 6. Vendor Portal Restyle

- [x] 6.1 Restyle `src/pages/vendor/login.astro` to the shared design language (presentation only — do not change the form fields, script, route, or redirect behaviour)
- [x] 6.2 Restyle `src/pages/vendor/index.astro` to the shared design language: apply the data table, status pills, and page shell to the invoice list and submission form (presentation only — no change to fields, scripts, routes, or data reads)

## 7. Verification

- [x] 7.1 Run `npm run build` to verify no type errors
- [x] 7.2 Manually verify staff flows: unauthenticated `/staff` redirects to `/staff/login`; login lands on `/staff`; the list shows all invoices plus the outstanding summary cards; the detail page shows the audit trail and only status-valid actions; approving/rejecting/ready-for-payment/reconciling updates status and appends an audit entry; logout clears the session and re-gates `/staff`
- [x] 7.3 Re-run the vendor portal checks after the restyle to confirm no behavioural regression: login, own-invoices list, valid + invalid submission, logout
- [x] 7.4 Verify the design language: status pills legible in both light and dark themes, numeric columns right-aligned with tabular figures, KPI cards render, and the layout is responsive with no horizontal page scroll (wide tables scroll within their own container)
