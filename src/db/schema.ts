import { sqliteTable, text, integer, real, foreignKey, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const vendor = sqliteTable('vendor', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  passcode_hash: text('passcode_hash').notNull(),
  contact_email: text('contact_email').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const invoice = sqliteTable('invoice', {
  id: text('id').primaryKey(),
  vendor_id: text('vendor_id').notNull().references(() => vendor.id),
  invoice_number: text('invoice_number').notNull(),
  po_reference: text('po_reference').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull(),
  due_date: integer('due_date', { mode: 'timestamp' }),
  source_document_path: text('source_document_path'),
  status: text('status').notNull(),
  match_status: text('match_status').notNull(),
  supersedes_invoice_id: text('supersedes_invoice_id'),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  supersedesFk: foreignKey({ columns: [table.supersedes_invoice_id], foreignColumns: [table.id] }),
  uniqueVendorInvoice: uniqueIndex('uq_vendor_invoice').on(table.vendor_id, table.invoice_number),
}));

export const staff = sqliteTable('staff', {
  id: text('id').primaryKey(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});
