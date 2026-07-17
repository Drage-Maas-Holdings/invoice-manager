## ADDED Requirements

### Requirement: Vendor entity and repository
The system SHALL persist vendors in a `vendor` table with fields `id`, `name` (unique), `passcode_hash`, `contact_email`, and `created_at`, and all reads and writes to vendor data MUST go through a `VendorRepository` interface — no code outside the repository implementation may call the Drizzle client for vendor data.

#### Scenario: Duplicate name rejected
- **WHEN** a vendor is created with a name that already exists
- **THEN** the operation fails and no second record with that name is persisted

#### Scenario: Lookup by name
- **WHEN** `findByName` is called with a provisioned vendor's exact name
- **THEN** the repository returns that vendor record, and returns `null` for an unknown name

### Requirement: CLI-only vendor provisioning
Vendors SHALL be created only via the vendor provisioning CLI (`npm run provision-vendor`), which prompts interactively for name, contact email, and passcode. The application MUST NOT expose any vendor signup, creation, or passcode-reset route or UI.

#### Scenario: Successful provisioning
- **WHEN** the CLI is run with valid inputs and a passcode of at least 12 characters
- **THEN** a vendor record is created through the repository with a bcrypt hash (cost 12) and the plaintext passcode is never persisted, logged, or echoed

#### Scenario: Short passcode rejected
- **WHEN** the CLI is given a passcode shorter than 12 characters
- **THEN** the CLI exits with an error and no record is created

#### Scenario: Existing name rejected
- **WHEN** the CLI is given a vendor name that already exists
- **THEN** the CLI reports the conflict and exits without creating a record

### Requirement: Passcodes hashed at rest
Vendor passcodes SHALL be stored only as bcrypt hashes with cost factor 12. Plaintext passcodes MUST never appear in the database, configuration files, environment variables, or logs.

#### Scenario: Stored value is a hash
- **WHEN** a vendor record is inspected after provisioning
- **THEN** `passcode_hash` is a bcrypt hash and the plaintext passcode appears nowhere in the database or repository files
