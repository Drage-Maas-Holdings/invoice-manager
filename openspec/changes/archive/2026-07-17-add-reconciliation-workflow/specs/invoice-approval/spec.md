## MODIFIED Requirements

### Requirement: Transition enforcement
Approve and reject SHALL only be valid for invoices whose current `status` is `pending_approval`. For an invoice in any other status the handler SHALL return 409 and MUST NOT change the invoice or write an audit entry. For an unknown invoice id the handler SHALL return 404. `rejected` is terminal: no route SHALL transition an invoice out of `rejected`.

#### Scenario: Unknown invoice
- **WHEN** approve or reject is posted for an id that matches no invoice
- **THEN** the response is 404 and no audit entry is written

#### Scenario: Already-approved invoice
- **WHEN** approve or reject is posted for an invoice in `approved`
- **THEN** the response is 409, the status is unchanged, and no audit entry is written

#### Scenario: Rejected is terminal
- **WHEN** approve is posted for an invoice in `rejected`
- **THEN** the response is 409 and the invoice remains `rejected`

#### Scenario: Ready for payment is not reversible to approved
- **WHEN** approve is posted for an invoice in `ready_for_payment`
- **THEN** the response is 409 and the status remains `ready_for_payment`
