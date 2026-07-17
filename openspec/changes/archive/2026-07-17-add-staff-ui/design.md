## Context

This is the final PRD build step (12). Every staff-side backend piece already exists: `POST /api/auth/staff/login`, the four transition routes (approve, reject, ready-for-payment, reconcile) built on `transitionInvoice`/`transitionToReconcile`, `auditLogRepository.findByInvoice`, `invoiceRepository.list`/`findById`, `vendorRepository.findById`, the `GET /api/staff/dashboard` query and its `bucketOutstandingLiabilities` function, and logout. What is missing is the UI.

The vendor portal (build step 11) established the exact pattern this step mirrors on the staff side: SSR pages behind a middleware-gated page prefix, forms posting to existing JSON endpoints via thin inline scripts, reusing `Layout`, the CSS-variable color system, and `ThemeToggle`.

As the final and most data-dense surface in the module, the staff UI is also where the module's visual design language is set. The scaffold shipped a semantic palette (`background`/`surface`/`border`/`text`/`text-muted`/`accent`) with a `.dark` convention, but no status colours and no shared layout primitives — pages have so far been styled ad hoc. This change establishes a deliberate, reusable design language and applies it module-wide, restyling the already-shipped vendor pages so staff and vendor surfaces read as one product.

## Goals / Non-Goals

**Goals:**
- A login-gated staff UI: login page, invoice list (with an outstanding-liabilities summary), and an invoice detail/review page exposing the audit trail and status-appropriate actions.
- Keep enforcement structural — extend `src/middleware.ts` to gate the `/staff` page prefix, exactly as `/vendor` was gated.
- Surface the step-10 dashboard query, which until now had a JSON endpoint but no UI.
- Establish a professional, financially-precise design language (enterprise-SaaS aesthetic; Stripe/Linear/Mercury/Ramp as reference points) as reusable tokens and utilities, and apply it consistently across both the new staff pages and the existing vendor pages.
- Reuse every existing endpoint, the Layout, color system, and ThemeToggle. No new backend, no new dependencies.

**Non-Goals:**
- No new API routes — login, transitions, dashboard, and logout all exist.
- No staff account management UI (accounts are CLI-provisioned per the PRD; no self-service).
- No editing of invoice fields — staff review and advance status, they do not mutate captured data.
- No configurable approval chains, bulk actions, or filtering/search beyond the plain list (out of scope for the MVP).
- No new UI framework, component library beyond the existing Flowbite/Tailwind setup, icon package, or web fonts — the design language is expressed in Tailwind utilities, CSS tokens, and inline SVG.
- No change to vendor-portal behaviour, routes, or data — the vendor work here is purely a restyle.

## Decisions

**Page gating in middleware, mirroring `/vendor`.** Add a `/staff` page-prefix branch to `src/middleware.ts`: no valid staff session → 302 redirect to `/staff/login`; `/staff/login` exempt. Rationale: consistency with the vendor gate and the PRD's structural-enforcement principle — a missed per-page check must never be a privilege-boundary failure. The `/api/staff/**` JSON-401 branch is untouched; pages redirect a human, APIs answer callers with JSON.

**Actions are gated by the invoice's current status, in the page.** The detail page renders only the controls valid for `status` (pending → approve/reject; approved → ready-for-payment; ready_for_payment → reconcile; terminal → none). Rationale: the server-side transition helpers are already the source of truth — they return 409 for an invalid transition — so the page-level gating is a UX affordance, not the security boundary. Showing only valid actions avoids inviting a guaranteed-409 click, while the backend still rejects any stale or forged request.

**Detail and list read the repositories server-side.** `/staff` calls `invoiceRepository.list()` and resolves vendor names via `vendorRepository`; `/staff/invoices/[id]` calls `findById` + `findByInvoice`. Rationale: the pages are already server-rendered behind the staff gate, so a separate read API would duplicate logic for no benefit — same decision as the vendor portal. A missing id returns Astro's 404.

**Outstanding-liabilities summary reuses `bucketOutstandingLiabilities`.** The list page calls the same pure function the dashboard endpoint uses, rather than fetching its own endpoint. Rationale: one source of truth for the bucketing, no extra round trip, and it finally gives the step-10 reporting query a visible home.

**Visual design language — a professional, financially-precise enterprise-SaaS aesthetic.** The look is calm, structured, and low-noise, taking Stripe Dashboard, Linear, Mercury, and Ramp as reference points. It is defined once as tokens and utilities and reused everywhere, rather than styled per page. Concretely:

- *Layout & spacing.* Generous, consistent whitespace on a desktop-first responsive grid (a constrained max-width content column, comfortable gutters). Below a tablet breakpoint the layout collapses gracefully — no horizontal page scroll; wide tables scroll inside their own container.
- *Typography.* A strong, restrained hierarchy from the system font stack: clearly distinct page title / section heading / body / caption sizes and weights, generous line-height for readability, tabular/monospaced numerics for money and IDs so columns align and figures read precisely.
- *Card-based summaries.* The outstanding-liabilities buckets and other at-a-glance figures render as a row of KPI cards — label, large tabular value, subtle divider/border — on `surface` with `border` and a soft radius, never heavy shadows.
- *Data tables, dense but readable.* Comfortable row height, a quiet header row (muted small-caps or medium-weight labels on `surface`), hairline `border` row separators, right-aligned numeric columns, and a subtle hover state. Density favours scanning many invoices without feeling cramped.
- *Subtle status colours.* Add semantic tokens for invoice `status` and `match_status`, expressed as muted tinted "pills" (soft tinted background + readable foreground), not saturated fills: e.g. neutral/amber for `submitted`/`pending_approval`, blue for in-progress `approved`/`ready_for_payment`, green for `reconciled`/`matched`, red for `rejected`/`unmatched`. Each token defines a light and a dark value so pills stay legible in both themes; colour is a reinforcement, never the only signal (the status label text is always present).
- *Iconography.* A small, consistent set of inline SVG icons (actions, statuses, nav) at a uniform stroke weight and size — no icon-font or package dependency.
- *Restraint.* Minimal borders and dividers doing the structural work; the gold `accent` reserved for primary actions and focus, not decoration.

Rationale: financial software earns trust through precision and calm, not ornament — aligned columns, legible figures, and predictable structure communicate accuracy. Centralising this as tokens/utilities keeps every surface consistent and makes the vendor restyle a matter of applying the same primitives. Alternatives considered — adding a component library or icon package — were rejected to honour the module's no-new-dependencies constraint; Tailwind utilities plus a few shared classes and inline SVGs are sufficient.

**Apply module-wide, restyling the vendor portal.** The same tokens, cards, table styling, and typography are applied to the existing `/vendor/login` and `/vendor` pages so the two surfaces match. Rationale: introducing a design language on staff pages while leaving the vendor portal on the ad-hoc scaffold styling would ship an internally inconsistent product. The vendor changes are presentation-only — markup/classes, not routes, scripts, or data flow — so the vendor-portal behavioural spec is unaffected (hence no spec delta for it).

## Risks / Trade-offs

- **Two "unauthenticated" behaviors (page redirect vs API 401)** → Already established for `/vendor`; extending it to `/staff` keeps the rule uniform. The rule is expressed once, in middleware.
- **Client-side action handling** → Inline fetch scripts post to the transition routes and reload on success. Mitigation: kept minimal; the transition endpoints remain the authority for validity (409 on bad transitions), so the script only surfaces server responses.
- **List has no pagination** → `list()` returns all invoices. Mitigation: fine at MVP scale; a future change can add paging/filtering without altering the page contract.
- **Restyling shipped vendor pages risks visual/behavioural regression** → the vendor portal already passed verification. Mitigation: touch only markup and classes, never scripts, routes, or data reads; keep the vendor login/submit/logout flows byte-for-byte in behaviour and re-run the manual vendor checks after the restyle. If a regression appears, the restyle of a given vendor page can be reverted independently of the staff work.
- **Status-colour tokens must stay legible in light and dark** → muted tints can wash out. Mitigation: define explicit light and dark values per status token and verify contrast in both themes; never rely on colour alone — the status label text is always shown.

## Migration Plan

Additive plus one middleware edit, one shared-token addition, and a vendor restyle. New pages under `src/pages/staff/`; `src/middleware.ts` gains a `/staff` page-prefix branch alongside the existing `/vendor` one; `src/styles/global.css` gains status-colour tokens and shared utilities; the existing vendor pages adopt the shared styling. No schema change, no migration. Rollback is reverting the staff pages, the middleware branch, the added tokens, and the vendor-page class changes — each independently revertable.
