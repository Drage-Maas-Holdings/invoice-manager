## MODIFIED Requirements

### Requirement: Route-prefix access enforcement
Middleware SHALL enforce access by path convention before any handler runs. For API routes: requests to `/api/staff/**` without a valid staff session, and requests to `/api/vendor/**` without a valid vendor session, MUST be rejected with 401. For vendor portal pages: requests to the `/vendor` page prefix without a valid vendor session (unauthenticated or wrong actor type) MUST be redirected to `/vendor/login`, except `/vendor/login` itself, which MUST remain public. Enforcement MUST live only in middleware — individual handlers and pages do not re-check `actor_type`.

#### Scenario: Unauthenticated staff route rejected
- **WHEN** a request without a session hits any path under `/api/staff/`
- **THEN** middleware returns 401 and the route handler never executes

#### Scenario: Wrong actor type rejected
- **WHEN** a request with a vendor session hits a path under `/api/staff/`
- **THEN** middleware returns 401 and the route handler never executes

#### Scenario: Unauthenticated vendor page redirected
- **WHEN** a request without a valid vendor session hits a `/vendor` page other than `/vendor/login`
- **THEN** middleware redirects the request to `/vendor/login` and the page is not rendered

#### Scenario: Vendor login page stays public
- **WHEN** a request without a session hits `/vendor/login`
- **THEN** middleware passes the request through and the login page is served

#### Scenario: Public routes unaffected
- **WHEN** a request without a session hits `/api/auth/staff/login` or a non-prefixed page
- **THEN** middleware passes the request through with `locals.actor` set to null
