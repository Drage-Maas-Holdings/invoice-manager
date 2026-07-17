## 1. Audit log entity

- [x] 1.1 Add `audit_log` table to `src/db/schema.ts` per the audit-log spec (nullable `staff_id`/`vendor_id` FKs, `actor_label`, `action`, nullable `notes`, `created_at`)
- [x] 1.2 Generate migration 0003 with `drizzle-kit generate` and apply with `drizzle-kit migrate`
- [x] 1.3 Create `src/repositories/audit-log.ts`: `AuditLogRecord`, `CreateAuditLogData`, `AuditAction` union (`submitted | matched | unmatched | approved | rejected`), and `AuditLogRepository` interface with only `create` and `findByInvoice`
- [x] 1.4 Create `src/repositories/audit-log.sqlite.ts` exporting singleton `auditLogRepository`; `create` validates the actor-attribution rule (exactly one FK for staff/vendor, both null for system) and throws on violation; `findByInvoice` orders ascending by `created_at`

## 2. Approval routes

- [x] 2.1 Create `src/pages/api/staff/invoices/[id]/approve.ts`: 404 unknown id, 409 unless `status === 'pending_approval'`, resolve staff email via `staffRepository.findById` (401 if actor record missing), `updateStatus` to `approved`, write `approved` audit entry with optional trimmed note (empty → null), return 200 with updated record
- [x] 2.2 Create `src/pages/api/staff/invoices/[id]/reject.ts`: same shape, transitioning to `rejected` with a `rejected` audit entry
- [x] 2.3 Confirm both routes need no middleware changes (covered by `/api/staff/**` prefix) and set `Content-Type: application/json` on all responses

## 3. Audit wiring into submission

- [x] 3.1 In `src/pages/api/vendor/invoices.ts`, after successful create: write `submitted` entry (actor vendor, `actor_label` = vendor name via `vendorRepository.findById`) then `matched`/`unmatched` system entry
- [x] 3.2 In `src/pages/api/staff/invoices.ts`, after successful create: write `submitted` entry (actor staff, `actor_label` = staff email) then `matched`/`unmatched` system entry
- [x] 3.3 Verify failure paths (400 validation, 500 PO read failure) write no audit entries in either route

## 4. Verification

- [x] 4.1 Live test approval flow: pending_approval → approve (200, audit entry with note), re-approve (409, no new entry), unknown id (404), vendor session (401)
- [x] 4.2 Live test rejection flow: pending_approval → reject (200, note preserved in trail), approve-after-reject (409, stays `rejected`)
- [x] 4.3 Live test submission audit: vendor and staff submissions each yield `submitted` + system match entries in `findByInvoice` chronological order; unmatched invoice remains approvable with `match_status` unchanged
- [x] 4.4 Confirm repository boundary: no code outside `src/repositories/` imports the Drizzle client; `npm test` still passes
