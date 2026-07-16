## ADDED Requirements

### Requirement: Shared signed-cookie session mechanism
The system SHALL provide a single session module that signs and verifies session cookies with HMAC-SHA256 using one signing key from `SESSION_SECRET`. The payload SHALL be discriminated by `actor_type`: `{actor_type: 'staff', staff_id, exp}` or `{actor_type: 'vendor', vendor_id, exp}`. Verification MUST return no actor (not throw) for missing, malformed, tampered, or expired tokens. The module MUST fail at startup if `SESSION_SECRET` is unset or shorter than 32 characters.

#### Scenario: Valid token round-trips
- **WHEN** a staff payload is signed and then verified before its expiry
- **THEN** verification returns the same `actor_type` and `staff_id`

#### Scenario: Tampered token rejected
- **WHEN** any byte of the token payload or signature is altered
- **THEN** verification returns no actor

#### Scenario: Expired token rejected
- **WHEN** a token past its `exp` timestamp is verified
- **THEN** verification returns no actor

#### Scenario: Missing secret fails fast
- **WHEN** the application starts without a valid `SESSION_SECRET`
- **THEN** the session module throws instead of signing with a default key

### Requirement: Staff login and logout
The system SHALL provide `POST /api/auth/staff/login` accepting email and password, verifying them against the staff repository with bcrypt, and on success setting a signed session cookie (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production, 12-hour expiry) with payload `{actor_type: 'staff', staff_id}`. It SHALL provide `POST /api/auth/logout` that clears the session cookie for any actor type. Failed logins MUST return 401 with a generic error that does not reveal whether the email exists.

#### Scenario: Successful staff login
- **WHEN** valid staff credentials are posted to `/api/auth/staff/login`
- **THEN** the response sets an HttpOnly session cookie whose payload identifies the staff account

#### Scenario: Wrong password
- **WHEN** a valid email with a wrong password is posted
- **THEN** the response is 401 with the same body as an unknown email, and no cookie is set

#### Scenario: Logout clears session
- **WHEN** an authenticated actor posts to `/api/auth/logout`
- **THEN** the session cookie is cleared and subsequent requests are unauthenticated

### Requirement: Middleware session decoding
`src/middleware.ts` SHALL decode the session cookie exactly once per request and attach the resolved actor (or null) to `context.locals.actor`, typed via `App.Locals`. Route handlers MUST read identity from `context.locals` and MUST NOT parse the session cookie themselves.

#### Scenario: Actor available to handlers
- **WHEN** a request carries a valid staff session cookie
- **THEN** any handler in the request sees `locals.actor` with `actor_type: 'staff'` and the staff id

### Requirement: Route-prefix access enforcement
Middleware SHALL enforce access by path convention before any handler runs: requests to `/api/staff/**` without a valid staff session, and requests to `/api/vendor/**` without a valid vendor session, MUST be rejected with 401. Enforcement MUST live only in middleware — individual handlers do not re-check `actor_type`.

#### Scenario: Unauthenticated staff route rejected
- **WHEN** a request without a session hits any path under `/api/staff/`
- **THEN** middleware returns 401 and the route handler never executes

#### Scenario: Wrong actor type rejected
- **WHEN** a request with a vendor session hits a path under `/api/staff/`
- **THEN** middleware returns 401 and the route handler never executes

#### Scenario: Public routes unaffected
- **WHEN** a request without a session hits `/api/auth/staff/login` or a non-prefixed page
- **THEN** middleware passes the request through with `locals.actor` set to null
