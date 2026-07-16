## Context

Build step 1 (scaffold) is verified complete: Astro v7 + Node adapter, Tailwind v4 + Flowbite v4 with the fixed theme tokens, SQLite + Drizzle with an empty `src/db/schema.ts`, an empty `src/repositories/`, and a pass-through `src/middleware.ts` stub. This change implements PRD build step 2: the `staff` entity, CLI provisioning, staff login, the shared signed-cookie session mechanism, and middleware access enforcement.

Constraints from the stack and PRD:
- All DB access goes through repository interfaces; routes and scripts never touch the Drizzle client directly.
- `src/middleware.ts` is the only routing hook; access enforcement is structural (route-prefix convention), not per-handler.
- One session mechanism for both actor types, discriminated by `actor_type` in the payload; build step 3 must reuse it with zero changes to the mechanism.
- No third-party auth provider, no self-service signup/reset. The PRD's confirmed scoping decisions supersede the scaffold skill's "no login route yet" default.

## Goals / Non-Goals

**Goals:**
- `staff` table, repository interface + SQLite implementation, migration.
- Account Provisioning CLI (interactive, bcrypt cost 12, writes via the repository).
- Session module: sign/verify a cookie payload discriminated by `actor_type`, one signing key from `SESSION_SECRET`.
- Staff login/logout API routes issuing/clearing the cookie.
- Middleware: decode session once per request into `context.locals.actor`; reject unauthenticated/wrong-actor requests to `/api/staff/**` and `/api/vendor/**` before handlers run.

**Non-Goals:**
- Vendor entity, passcode gate, or any vendor login route (build step 3 — but the session payload type and middleware vendor-prefix rule are defined now so step 3 is additive).
- Rate limiting / lockout (PRD known gap), password reset, staff UI pages, invoices, audit log.
- PocketBase or any external auth.

## Decisions

**Table is `staff`, not `accounts`.** The PRD data model names the entity `staff` and later entities (`audit_log.staff_id`) FK to it. The CLI tool follows the Stack Reference provisioning pattern (same fields, bcrypt 12, repository-only writes) but targets the staff repository. Field shape matches the PRD exactly: `id`, `first_name`, `last_name`, `email` (unique), `password_hash`, `created_at`.

**Session token: HMAC-SHA256 signed payload via `node:crypto`, no JWT library.** Token format `base64url(json).base64url(hmac)`. A JWT lib adds a dependency and algorithm-confusion surface for what is a single-key, single-issuer cookie. Payload: `{ actor_type: 'staff', staff_id, exp }` or `{ actor_type: 'vendor', vendor_id, exp }` (vendor variant is defined in the type union now, produced only in step 3). `exp` is a unix timestamp; verify rejects expired or bad-signature tokens by returning `null` — no exceptions for control flow. Expiry: 12 hours from login.

**One session module (`src/lib/session.ts`)** exporting `createSessionToken(payload)`, `verifySessionToken(token)`, the cookie name (`session`), and cookie attribute constants (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` when `import.meta.env.PROD`). Signing key comes from `SESSION_SECRET` (min 32 chars); the module throws at startup if it's missing, rather than silently signing with a weak default.

**Login routes live under `/api/auth/**`, outside the protected prefixes.** `/api/staff/**` requires an existing staff session, so the login endpoint cannot live there. Routes: `POST /api/auth/staff/login` (email + password → verify via `staffRepository.findByEmail` + `bcrypt.compare` → set cookie) and `POST /api/auth/logout` (clear cookie; works for any actor type, so step 3 reuses it). Login failure returns 401 with a generic message — no distinction between unknown email and wrong password.

**Middleware enforcement by prefix map.** `src/middleware.ts` decodes the cookie once, sets `context.locals.actor` (typed via `App.Locals` in `src/env.d.ts`: `{ actor_type: 'staff', staff_id } | { actor_type: 'vendor', vendor_id } | null`). Then: path starts with `/api/staff/` → require `actor_type === 'staff'` else 401 JSON; path starts with `/api/vendor/` → require `actor_type === 'vendor'` else 401 JSON. Everything else passes through with `locals.actor` available. Handlers read identity from `locals`, never re-parse the cookie.

**Repository interface shape** follows the stack pattern: `StaffRepository` with `create`, `findByEmail`, `findById`, `list`, `delete`; SQLite implementation in `src/repositories/staff.sqlite.ts`; singleton export `staffRepository` typed as the interface.

**Dependencies:** `bcrypt` (runtime), `@types/bcrypt` + `tsx` (dev). CLI runs as `npm run provision-account` → `tsx scripts/provision-account.ts`. Password prompted interactively, never passed as an argument (visible in `ps`/history), min 12 chars.

## Risks / Trade-offs

- [Single shared `SESSION_SECRET`; rotation invalidates all sessions] → Acceptable for MVP; sessions are 12h and stateless. Documented; rotation = change env var and restart.
- [Stateless cookie means no server-side revocation before expiry] → Accepted for MVP scope (matches PRD's "signed cookie, no auth provider"); 12h expiry bounds the window.
- [No rate limiting on login] → PRD Section 9 accepts this explicitly for this release.
- [Middleware prefix matching is string-based] → Use `startsWith('/api/staff/')`-style checks on `context.url.pathname`; add a test/verification that a staff route without a session is rejected, since this boundary is the module's core security guarantee.
- [`better-sqlite3` + `tsx` CLI shares `data.db` with the dev server] → SQLite handles concurrent access for this workload; WAL not needed at MVP scale.

## Migration Plan

1. Install deps, add `SESSION_SECRET` to `.env` (and document in README that it must be set per environment).
2. Add schema + `npx drizzle-kit generate` + `npx drizzle-kit migrate`.
3. Provision a first staff account via the CLI to verify end-to-end.
Rollback: revert the change; the migration only adds the `staff` table.

## Open Questions

None — the PRD's Section 3 decisions resolve the previously open auth questions.
