import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const vendor = sqliteTable('vendor', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  passcode_hash: text('passcode_hash').notNull(),
  contact_email: text('contact_email').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const staff = sqliteTable('staff', {
  id: text('id').primaryKey(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});
