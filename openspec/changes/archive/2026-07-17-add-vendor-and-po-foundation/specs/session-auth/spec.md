## ADDED Requirements

### Requirement: Vendor login
The system SHALL provide `POST /api/auth/vendor/login` accepting a vendor name and passcode, verifying them against the vendor repository with bcrypt, and on success setting the shared signed session cookie (same cookie name, attributes, and 12-hour expiry as staff sessions) with payload `{actor_type: 'vendor', vendor_id}`. Failed logins MUST return 401 with a generic error that does not reveal whether the vendor name exists. The existing session module, logout route, and middleware enforcement MUST be reused without modification.

#### Scenario: Successful vendor login
- **WHEN** a valid vendor name and passcode are posted to `/api/auth/vendor/login`
- **THEN** the response sets an HttpOnly session cookie whose payload has `actor_type: 'vendor'` and that vendor's id

#### Scenario: Wrong passcode
- **WHEN** a valid vendor name with a wrong passcode is posted
- **THEN** the response is 401 with the same body as an unknown vendor name, and no cookie is set

#### Scenario: Vendor session passes the vendor boundary
- **WHEN** a request with a vendor session cookie hits a path under `/api/vendor/`
- **THEN** middleware passes it through with `locals.actor.actor_type` equal to `'vendor'`

#### Scenario: Vendor session rejected at the staff boundary
- **WHEN** a request with a vendor session cookie hits a path under `/api/staff/`
- **THEN** middleware returns 401 and the route handler never executes
