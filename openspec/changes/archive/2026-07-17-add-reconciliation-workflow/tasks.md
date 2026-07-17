## 1. Type Updates

- [x] 1.1 Extend `AuditAction` in `src/repositories/audit-log.ts` with `'ready_for_payment'` and `'reconciled'` values

## 2. Reconciliation Logic

- [x] 2.1 Create `src/lib/invoice-reconciliation.ts` with `transitionToReconcile` function following the `invoice-approval.ts` pattern, parameterized for `approved → ready_for_payment` and `ready_for_payment → reconciled` transitions

## 3. API Routes

- [x] 3.1 Create `src/pages/api/staff/invoices/[id]/ready-for-payment.ts` — POST route calling `transitionToReconcile` with source `approved`, target `ready_for_payment`, action `ready_for_payment`
- [x] 3.2 Create `src/pages/api/staff/invoices/[id]/reconcile.ts` — POST route calling `transitionToReconcile` with source `ready_for_payment`, target `reconciled`, action `reconciled`

## 4. Audit Log Wiring

- [x] 4.1 Verify `ready_for_payment` and `reconciled` actions are written to `audit_log` by the new routes (covered by transition function, but confirm end-to-end)

## 5. Verification

- [x] 5.1 Run `npm run build` to verify no type errors
- [x] 5.2 Manually test: approve an invoice, mark ready for payment, reconcile — verify audit trail for each step
