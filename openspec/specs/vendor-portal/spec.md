## Purpose

Vendors need a passcode-gated portal to log in, submit invoices, see their own submissions with status and match results, and correct rejected invoices.

## Requirements

### Requirement: Vendor login page
The system SHALL serve a public login page at `/vendor/login` with a form collecting vendor name and passcode that submits to `POST /api/auth/vendor/login`. On successful login the vendor SHALL be taken to `/vendor`; on failure the page SHALL show a generic error that does not reveal whether the vendor name exists. The login page MUST remain reachable without a session.

#### Scenario: Login page reachable without a session
- **WHEN** a request without any session hits `/vendor/login`
- **THEN** the page is served (not redirected) with the login form

#### Scenario: Successful login lands on the portal
- **WHEN** a vendor submits a correct name and passcode
- **THEN** a vendor session cookie is set and the vendor arrives at `/vendor`

#### Scenario: Failed login shows a generic error
- **WHEN** a vendor submits an incorrect name or passcode
- **THEN** the page shows a generic "invalid name or passcode" error and no session is set

### Requirement: Vendor portal shows only the session vendor's invoices
The `/vendor` page SHALL list the invoices belonging to the authenticated session's `vendor_id` only, read server-side via the invoice repository. Each row SHALL display the invoice number, PO reference, amount, currency, due date, workflow `status`, and `match_status`. The page MUST NOT expose any invoice belonging to another vendor.

#### Scenario: Own invoices listed
- **WHEN** an authenticated vendor opens `/vendor`
- **THEN** the page lists that vendor's invoices with number, PO reference, amount, currency, due date, status, and match status

#### Scenario: Other vendors' invoices never shown
- **WHEN** an authenticated vendor opens `/vendor`
- **THEN** no invoice whose `vendor_id` differs from the session's `vendor_id` appears

### Requirement: Vendor invoice submission form
The `/vendor` page SHALL provide a form that submits a new invoice to `POST /api/vendor/invoices` with invoice number, PO reference, amount, currency, and optional due date, plus an optional `supersedes_invoice_id` for correcting a previously rejected invoice. On success the new invoice SHALL appear in the vendor's list; on validation failure the form SHALL show the error returned by the API.

#### Scenario: Successful submission appears in the list
- **WHEN** a vendor submits a valid new invoice
- **THEN** the invoice is created for that vendor and appears in the portal list with its resulting `match_status`

#### Scenario: Invalid submission shows the API error
- **WHEN** a vendor submits an invoice missing a required field or with a non-positive amount
- **THEN** the form shows the validation error and no invoice is created

#### Scenario: Correcting a rejected invoice
- **WHEN** a vendor submits a new invoice referencing a prior invoice via `supersedes_invoice_id`
- **THEN** the new invoice is created linked to the referenced invoice for traceability

### Requirement: Vendor logout
The portal SHALL provide a logout control that submits to `POST /api/auth/logout`, clearing the session and returning the vendor to `/vendor/login`.

#### Scenario: Logout clears the session
- **WHEN** an authenticated vendor triggers logout
- **THEN** the session cookie is cleared and a subsequent request to `/vendor` redirects to `/vendor/login`
