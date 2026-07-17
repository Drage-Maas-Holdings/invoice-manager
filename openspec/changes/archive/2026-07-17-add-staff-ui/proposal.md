## Why

The staff-facing backend is complete — login, invoice transitions (approve, reject, ready-for-payment, reconcile), the per-invoice audit trail, and the outstanding-liabilities dashboard query — but staff have no UI. There is no way to log in, browse invoices, review one with its audit history, or take an action without hitting the raw API. PRD Section 6 and build step 12 (the final step) call for a login-gated staff UI covering list, review, approve, and reconcile, plus surfacing the dashboard from step 10.

## What Changes

- Add a staff login page (`/staff/login`) posting to the existing `POST /api/auth/staff/login`.
- Add the staff invoice list page (`/staff`) reading `invoiceRepository.list()` server-side, showing vendor name, invoice number, PO reference, amount, currency, due date, `status`, and `match_status`, with a compact outstanding-liabilities summary sourced from the existing dashboard query (build step 10).
- Add the invoice detail/review page (`/staff/invoices/[id]`) showing full invoice fields, the per-invoice audit trail (`auditLogRepository.findByInvoice`), and the action controls valid for the invoice's current `status`:
  - `pending_approval` → Approve or Reject (with optional note) via the existing approve/reject routes.
  - `approved` → Mark ready for payment.
  - `ready_for_payment` → Mark reconciled.
  - Terminal states (`rejected`, `reconciled`) show no actions.
- Add a logout control posting to the existing `POST /api/auth/logout`; reuse `Layout`, the color system, and `ThemeToggle`.
- **Extend `src/middleware.ts`** to gate the `/staff` page prefix: unauthenticated or non-staff requests to a `/staff` page are redirected to `/staff/login`, while `/staff/login` stays public and the `/api/**` JSON-401 behavior is unchanged.
- **Establish a shared visual design language** that reads as professional and financially precise — a modern enterprise-SaaS aesthetic in the spirit of Stripe Dashboard, Linear, Mercury, and Ramp: generous spacing, a strong typographic hierarchy, card-based summaries, dense-but-readable data tables, subtle semantic status colours, consistent inline-SVG iconography, and minimal visual noise, responsive desktop-first. Add semantic status-colour tokens (currently missing) and shared card/table/typography utilities to `src/styles/global.css`, honouring the existing light/dark convention.
- **Apply the design language module-wide**: build the new staff pages against it and restyle the already-shipped vendor portal pages (`/vendor/login`, `/vendor`) so both surfaces are visually consistent. No behavioural change to the vendor portal — presentation only.

## Capabilities

### New Capabilities

- `staff-portal`: The login-gated staff UI — login page, invoice list with an outstanding-liabilities summary, and an invoice detail/review view exposing the audit trail and the status-appropriate approve/reject/ready-for-payment/reconcile actions.

### Modified Capabilities

- `session-auth`: The route-prefix access enforcement requirement is extended so middleware also guards the `/staff` **page** prefix, redirecting unauthenticated or wrong-actor requests to `/staff/login` (page redirect) while keeping the API-route JSON 401 behavior and the public `/staff/login` page unchanged. This mirrors the `/vendor` page-gating already added.

## Impact

- `src/pages/staff/login.astro`, `src/pages/staff/index.astro`, `src/pages/staff/invoices/[id].astro` — new pages.
- `src/middleware.ts` — extended to gate the `/staff` page prefix with a redirect.
- `src/styles/global.css` — additive semantic status-colour tokens and shared card/table/typography utilities (light + dark); `src/layouts/Layout.astro` may gain shared page-shell/typography defaults.
- `src/pages/vendor/login.astro`, `src/pages/vendor/index.astro` — restyled to the shared design language (presentation only; behaviour, routes, and data unchanged).
- No changes to the staff login, transition, dashboard, or logout APIs, repositories, schema, or matching/approval logic. Iconography is inline SVG, so no new dependencies, no migration.
