## ADDED Requirements

### Requirement: matchInvoiceToPO function
The system SHALL provide a pure function `matchInvoiceToPO(invoiceFields: { vendor_name: string; amount: number; currency: string }, po: PurchaseOrder | null): 'matched' | 'unmatched'` in `src/lib/matching.ts`. The function SHALL return `'matched'` only when the PO is not null AND all three fields match: the invoice's vendor name equals the PO's vendor name (case-insensitive), the invoice's amount equals the PO's total amount (within 0.01 tolerance for floating-point), and the invoice's currency equals the PO's currency (case-insensitive). The function SHALL NOT import or call `PORepository` — it receives the PO as an argument.

#### Scenario: All fields match
- **WHEN** the function is called with an invoice matching the PO on vendor name, amount, and currency
- **THEN** it returns `'matched'`

#### Scenario: No PO found
- **WHEN** the function is called with `null` for the PO
- **THEN** it returns `'unmatched'`

#### Scenario: Vendor name mismatch
- **WHEN** the invoice vendor name differs from the PO vendor name
- **THEN** it returns `'unmatched'` regardless of other fields

#### Scenario: Amount mismatch
- **WHEN** the invoice amount differs from the PO total amount by more than 0.01
- **THEN** it returns `'unmatched'` regardless of other fields

#### Scenario: Currency mismatch
- **WHEN** the invoice currency differs from the PO currency
- **THEN** it returns `'unmatched'` regardless of other fields

#### Scenario: Case-insensitive vendor name match
- **WHEN** the invoice vendor name is "Acme Corp" and the PO vendor name is "ACME CORP"
- **THEN** the function returns `'matched'` if amount and currency also match

#### Scenario: Case-insensitive currency match
- **WHEN** the invoice currency is "usd" and the PO currency is "USD"
- **THEN** the function returns `'matched'` if vendor and amount also match

#### Scenario: Floating-point amount comparison
- **WHEN** the invoice amount is 100.005 and the PO amount is 100.0
- **THEN** the function returns `'matched'` because the difference is within the 0.01 tolerance

### Requirement: Matching location and purity
The `matchInvoiceToPO` function SHALL live in `src/lib/matching.ts`, not in any repository, API route, or middleware file. It SHALL be a pure function with no side effects and no imports of repositories, database clients, or external services.

#### Scenario: Function is independently testable
- **WHEN** a unit test calls `matchInvoiceToPO` with a mock invoice and PO
- **THEN** it returns the correct result without requiring a database, file system, or network

### Requirement: Unit test coverage for all matching paths
The system SHALL include vitest unit tests for `matchInvoiceToPO` that exercise all six decision paths: no PO found, vendor name mismatch, amount beyond tolerance, currency mismatch, amount within tolerance boundary, and all-fields-match success. These tests SHALL run without a database, PO data file, or network — the function receives its PO argument directly.

#### Scenario: All six code paths tested
- **WHEN** a unit test suite is run
- **THEN** each of the six code paths in `matchInvoiceToPO` is covered by at least one assertion

#### Scenario: No-PO path
- **WHEN** the function is called with `po: null`
- **THEN** it returns `'unmatched'`

#### Scenario: Tolerance boundary
- **WHEN** the invoice amount differs from the PO amount by exactly 0.01
- **THEN** the function returns `'matched'` (boundary included)
