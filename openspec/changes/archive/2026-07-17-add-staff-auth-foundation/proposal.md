## Why

The invoice-manager module is scaffolded (build step 1) but has no entities and no way to authenticate anyone. Every later build step in the PRD — vendor gate, invoice capture, approval, audit trail — depends on the staff entity, the shared signed-cookie session mechanism, and middleware-enforced access boundaries being in place first. This change implements build step 2 of `resources/PRD.md`.

## What Changes

- Add the `staff` Drizzle table (`id`, `first_name`, `last_name`, `email` unique, `password_hash`, `created_at`) with repository interface + SQLite implementation, per the stack entity pattern.
- Add the Account Provisioning CLI tool (`scripts/provision-account.ts`, run via `npm run provision-account`): interactive prompts for first name, last name, email, password; bcrypt cost 12; writes through the staff repository. No in-app signup or password reset.
- Add a shared signed-cookie session mechanism (one signing key, one encode/decode module) whose payload is discriminated by `actor_type` — `{actor_type: 'staff', staff_id}` now, `{actor_type: 'vendor', vendor_id}` reused unchanged in build step 3.
- Add a staff login API route that verifies email + password against the staff repository and issues the session cookie, plus a logout route that clears it.
- Extend `src/middleware.ts` to decode the session once per request, attach the resolved actor to `context.locals`, and enforce access by route-path convention: `/api/staff/**` requires a staff session, `/api/vendor/**` requires a vendor session; rejection happens in middleware before any handler runs.
- Add `SESSION_SECRET` to `.env` and new dependencies: `bcrypt`, `tsx` (dev), `@types/bcrypt` (dev).

Note: the PRD's confirmed scoping decisions (Section 3) supersede the scaffold skill's default "no login route / no sessions yet" rule — this module explicitly builds the login route, session mechanism, and middleware enforcement now.

## Capabilities

### New Capabilities
- `staff-accounts`: the staff entity, its repository, and CLI-only account provisioning (bcrypt-hashed passwords, no self-service flows).
- `session-auth`: the shared signed-cookie session mechanism (actor_type-discriminated payload), staff login/logout routes, and middleware session decoding + route-prefix access enforcement for `/api/staff/**` and `/api/vendor/**`.

### Modified Capabilities

(none — no existing specs)

## Impact

- `src/db/schema.ts`: first real table (`staff`); Drizzle migration generated and applied.
- `src/repositories/`: `staff.ts` interface + SQLite implementation.
- `src/middleware.ts`: replaces the pass-through stub with session decoding and route-prefix enforcement.
- `src/pages/api/`: new auth routes (staff login/logout).
- `scripts/provision-account.ts`, `package.json` (new script + deps), `.env` (`SESSION_SECRET`).
- Downstream: build step 3 (vendor gate) reuses `session-auth` unchanged; steps 5–12 rely on `context.locals` actor and the route-prefix boundary.
