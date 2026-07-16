## 1. Dependencies & Environment

- [x] 1.1 Install `bcrypt`; install `@types/bcrypt` and `tsx` as dev dependencies
- [x] 1.2 Add `SESSION_SECRET` (32+ chars) to `.env` and note the requirement in README
- [x] 1.3 Add `provision-account` script (`tsx scripts/provision-account.ts`) to `package.json`

## 2. Staff Entity

- [x] 2.1 Define `staff` table in `src/db/schema.ts` (`id`, `first_name`, `last_name`, `email` unique, `password_hash`, `created_at`) per the stack entity pattern
- [x] 2.2 Create `StaffRepository` interface in `src/repositories/staff.ts` (`create`, `findByEmail`, `findById`, `list`, `delete`)
- [x] 2.3 Implement `SqliteStaffRepository` in `src/repositories/staff.sqlite.ts` and export the `staffRepository` singleton
- [x] 2.4 Generate and apply the Drizzle migration (`npx drizzle-kit generate && npx drizzle-kit migrate`)

## 3. Account Provisioning CLI

- [x] 3.1 Create `scripts/provision-account.ts`: interactive prompts (first name, last name, email, password), duplicate-email check via `findByEmail`, min-12-char password, bcrypt cost 12, create via repository only; never echo, log, or accept the password as an argument
- [x] 3.2 Verify end-to-end: run `npm run provision-account`, confirm the row exists with a bcrypt hash and that a duplicate email or short password exits with an error

## 4. Session Mechanism

- [x] 4.1 Create `src/lib/session.ts`: HMAC-SHA256 sign/verify (`base64url(json).base64url(hmac)` via `node:crypto`), actor-discriminated payload type (`staff`/`vendor` union), 12-hour `exp`, cookie name + attribute constants; throw at load if `SESSION_SECRET` is missing or under 32 chars
- [x] 4.2 Verify token behavior: valid round-trip, tampered token → null, expired token → null

## 5. Auth Routes

- [x] 5.1 Create `POST /api/auth/staff/login` (`src/pages/api/auth/staff/login.ts`): validate body, `findByEmail` + `bcrypt.compare`, set signed session cookie (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in prod) on success; generic 401 for unknown email and wrong password alike
- [x] 5.2 Create `POST /api/auth/logout` (`src/pages/api/auth/logout.ts`): clear the session cookie regardless of actor type

## 6. Middleware Enforcement

- [x] 6.1 Type `App.Locals` in `src/env.d.ts` with `actor: {actor_type: 'staff', staff_id: string} | {actor_type: 'vendor', vendor_id: string} | null`
- [x] 6.2 Rewrite `src/middleware.ts`: decode the session cookie once per request into `locals.actor`; reject `/api/staff/**` without a staff session and `/api/vendor/**` without a vendor session with 401 JSON before handlers run; pass all other paths through
- [x] 6.3 Add a temporary probe route under `/api/staff/` (or use the first real staff route) to verify: no session → 401, staff session → 200, and login → cookie → protected route flow works end to end

## 7. Verification

- [x] 7.1 Start the dev server (`astro dev --background`), exercise the full flow with curl: provision account → login (cookie set) → protected staff route (200) → logout → protected route (401) → wrong password (generic 401)
- [x] 7.2 Confirm no route or script imports the Drizzle client directly except `src/db/client.ts` consumers inside `src/repositories/`
