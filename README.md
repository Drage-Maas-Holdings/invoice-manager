# Invoice Manager

A single-function module for handling supplier invoices from submission through to reconciliation.

## What it does now

- Vendors submit invoices through a simple portal (upload a document and/or enter details manually) and can track the status of what they've submitted.
- Each invoice is checked against the matching purchase order (number, vendor, amount, currency).
- A staff member reviews and approves or rejects each invoice in a single step.
- Approved invoices are marked ready for payment (payment itself happens outside this module for now).
- Once paid, invoices are manually marked as reconciled.
- Every action is recorded in an audit trail: what happened, when, and by whom.
- A simple dashboard shows what's outstanding and when it's due.

## What's coming later

- Automatic invoice reading from uploaded documents or email, instead of manual entry (OCR/AI extraction).
- Matching against received goods as well as the purchase order (three-way matching).
- Multiple approval steps for larger or higher-value invoices.
- Direct payment initiation and bank/ERP integration.
- Automatic reconciliation with the accounting system, instead of manual marking.
- Fraud detection and deeper compliance checks.
- More vendor portal features beyond submitting and tracking.

## Environment

- `SESSION_SECRET` — a 32+ character secret key used to sign session cookies. Must be set per environment.

## Managing staff accounts

```sh
npm run provision-account
```

Prompts interactively for first name, last name, email, and password (min 12 chars).
Creates a staff account with a bcrypt-hashed password (cost 12).
No self-service signup, no password reset — this is the only way to add accounts.

## Scope note

This is the first module in the suite, built to handle one company's invoices end to end at a basic level. It is intentionally simple: no automation beyond the matching check above, and no integration with payment or accounting systems yet. Those are planned additions, not gaps in the current design.