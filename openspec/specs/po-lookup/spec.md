## Purpose

PO lookup provides a read-only interface for querying purchase order reference data. It is designed to be swappable — starting with a local JSON mock and eventually backed by an ERP system — without changing any consumer code. A critical invariant is that data-source faults are always surfaced as errors, never mistaken for "no matching PO".

## Requirements

### Requirement: Read-only PO repository interface
The system SHALL provide a `PORepository` interface with exactly one method, `findByNumber(poNumber): Promise<PurchaseOrder | null>`, where `PurchaseOrder` has `po_number`, `vendor_name`, `total_amount`, and `currency`. The interface MUST NOT include create, update, or delete methods, and the repository MUST NOT perform any comparison between a PO and an invoice — it is lookup only.

#### Scenario: Known PO number
- **WHEN** `findByNumber` is called with a PO number present in the reference data
- **THEN** it returns that purchase order with all four fields populated

#### Scenario: Unknown PO number
- **WHEN** `findByNumber` is called with a PO number absent from the reference data
- **THEN** it returns `null`

### Requirement: Mock JSON data source
The initial `PORepository` implementation SHALL read purchase orders from a JSON file (default `data/purchase-orders.json`, overridable via `PO_DATA_PATH`). All access to PO reference data MUST go through the `PORepository` interface so the JSON file can later be swapped for an ERP-backed implementation without changing any consumer.

#### Scenario: Lookup reflects file contents
- **WHEN** the JSON file contains a PO and `findByNumber` is called with its number
- **THEN** the returned object matches the file's entry for that PO

### Requirement: Read failure is an error, not a miss
If the PO data source cannot be read — the file is missing, is not valid JSON, or contains entries missing required fields — `findByNumber` MUST throw rather than return `null`, so a system fault is never mistaken for "no matching PO".

#### Scenario: Missing data file
- **WHEN** `findByNumber` is called while the JSON file does not exist
- **THEN** the call throws an error and does not return `null`

#### Scenario: Malformed data file
- **WHEN** `findByNumber` is called while the JSON file contains invalid JSON or a PO entry missing a required field
- **THEN** the call throws an error and does not return `null`
