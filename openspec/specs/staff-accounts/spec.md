## Purpose

Staff accounts are the internal-user identity for the invoice-manager module: staff members review, approve, and reconcile invoices under an authenticated identity. Accounts are provisioned entirely out-of-band via a CLI tool (per the Stack Reference — no self-service signup, no in-app account creation or password reset), and every account's password is stored only as a bcrypt hash.

## Requirements

### Requirement: Staff entity and repository
The system SHALL persist staff accounts in a `staff` table with fields `id`, `first_name`, `last_name`, `email` (unique), `password_hash`, and `created_at`, and all reads and writes to staff data MUST go through a `StaffRepository` interface — no code outside the repository implementation may call the Drizzle client for staff data.

#### Scenario: Duplicate email rejected
- **WHEN** a staff account is created with an email that already exists
- **THEN** the operation fails and no second record with that email is persisted

#### Scenario: Lookup by email
- **WHEN** `findByEmail` is called with a provisioned account's email
- **THEN** the repository returns that staff record, and returns `null` for an unknown email

### Requirement: CLI-only account provisioning
Staff accounts SHALL be created only via the Account Provisioning CLI (`npm run provision-account`), which prompts interactively for first name, last name, email, and password. The application MUST NOT expose any signup, account-creation, or password-reset route or UI.

#### Scenario: Successful provisioning
- **WHEN** the CLI is run with valid inputs and a password of at least 12 characters
- **THEN** a staff record is created through the repository with a bcrypt hash (cost 12) and the plaintext password is never persisted, logged, or echoed

#### Scenario: Short password rejected
- **WHEN** the CLI is given a password shorter than 12 characters
- **THEN** the CLI exits with an error and no record is created

#### Scenario: Existing email rejected
- **WHEN** the CLI is given an email that already has an account
- **THEN** the CLI reports the conflict and exits without creating a record

### Requirement: Passwords hashed at rest
Staff passwords SHALL be stored only as bcrypt hashes with cost factor 12. Plaintext credentials MUST never appear in the database, configuration files, environment variables, or logs.

#### Scenario: Stored value is a hash
- **WHEN** a staff record is inspected after provisioning
- **THEN** `password_hash` is a bcrypt hash and the plaintext password appears nowhere in the database or repository files
