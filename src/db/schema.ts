import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const staff = sqliteTable('staff', {
  id: text('id').primaryKey(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull(),
});
