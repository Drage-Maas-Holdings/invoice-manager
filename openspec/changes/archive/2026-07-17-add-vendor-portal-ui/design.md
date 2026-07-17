## Context

Build steps 3, 5, 8, and the session layer produced everything the vendor portal needs on the backend: passcode login (`POST /api/auth/vendor/login`), invoice submission with matching and audit wiring (`POST /api/vendor/invoices`), logout (`POST /api/auth/logout`), the signed-cookie session, and `invoiceRepository.findByVendor`. What is missing is the UI. This step (PRD build step 11) is the first real user-facing surface in the module; only a placeholder `index.astro` exists today.

The scaffold already established the presentation conventions: `src/layouts/Layout.astro` (Flowbite + the CSS-variable color system in `global.css`) and a `ThemeToggle` component. Middleware currently gates only `/api/staff/**` and `/api/vendor/**` by returning JSON 401; page routes are ungated.

## Goals / Non-Goals

**Goals:**
- A passcode-gated vendor portal: login page, own-invoice list with status + match result, and a submission form (with optional supersedes reference).
- Strict scoping: a vendor sees only invoices for the session's `vendor_id`.
- Keep access enforcement structural — extend the one sanctioned hook (`src/middleware.ts`) to cover the `/vendor` page prefix, rather than checking the session inside each page.
- Reuse existing APIs, the Layout, the color system, and ThemeToggle. No new dependencies.

**Non-Goals:**
- No new backend endpoints — submission, login, and logout APIs already exist.
- No messaging, negotiation, or dispute UI (PRD Section 6, out of scope).
- No file-upload widget beyond passing an optional `source_document_path` reference; there is no OCR and no storage service in scope.
- No staff UI — that is build step 12.

## Decisions

**Page gating lives in middleware, as a redirect.** The `/vendor` page prefix is enforced in `src/middleware.ts` alongside the existing API-prefix checks: no valid vendor session → 302 redirect to `/vendor/login`; `/vendor/login` is explicitly exempt so it stays public. Rationale: the PRD's core enforcement principle (Section 3, step 2) is that a missed per-handler check must never be a privilege-boundary failure — centralizing page gating in middleware upholds that. Pages get a redirect (correct for a browser navigation) while API routes keep their JSON 401 (correct for fetch callers). Alternative considered — gating in each page's frontmatter — was rejected because it reintroduces the "every page must remember to check" failure mode the middleware convention exists to prevent.

**Portal reads invoices server-side, not via a new API.** `/vendor/index.astro` calls `invoiceRepository.findByVendor(context.locals.actor.vendor_id)` directly in frontmatter (SSR). Rationale: the page is already server-rendered behind the vendor gate, so a separate `GET /api/vendor/invoices` would duplicate the scoping and add a round trip for no benefit. The `vendor_id` comes only from the verified session, never from a query param, which is what makes cross-vendor access structurally impossible.

**Forms post to existing endpoints; the browser handles navigation.** The login form posts to `/api/auth/vendor/login`, the submission form to `/api/vendor/invoices`, logout to `/api/auth/logout`. A small amount of inline client script submits via `fetch`, shows the API's error message on failure, and navigates/reloads on success. Rationale: reuses the established JSON contracts unchanged and keeps the pages thin.

## Risks / Trade-offs

- **Redirect vs. 401 inconsistency between pages and APIs** → Two behaviors for "unauthenticated" could confuse. Mitigation: the distinction is intentional and documented in the spec — pages redirect a human to login, APIs return JSON for programmatic callers. The rule is expressed once, in middleware.
- **Client-side form handling for error display** → Inline fetch scripts add a little page JS. Mitigation: kept minimal and progressive; the underlying POST endpoints are the source of truth for validation, so the script only surfaces server errors, never re-implements validation.
- **Supersedes reference is free-form** → A vendor could reference an invoice id that isn't theirs. Mitigation: out of scope to fully police here; `invoiceRepository.create` already validates the referenced invoice exists, and the field is traceability-only (does not affect matching/approval), consistent with PRD decision #39.

## Migration Plan

Additive plus one middleware edit. New pages under `src/pages/vendor/`; `src/middleware.ts` gains a `/vendor` page-prefix branch. No schema change, no migration. Rollback is reverting the pages and the middleware branch.
