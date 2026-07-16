import { db } from '../db/client';
import { staff } from '../db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { StaffRecord, StaffRepository } from './staff';

function rowToRecord(row: typeof staff.$inferSelect): StaffRecord {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    password_hash: row.password_hash,
    created_at: row.created_at,
  };
}

export const staffRepository: StaffRepository = {
  create(data) {
    const id = data.id ?? randomUUID();
    const now = new Date();
    db.insert(staff).values({
      id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      password_hash: data.password_hash,
      created_at: now,
    }).run();
    return { ...data, id, created_at: now };
  },

  findByEmail(email) {
    const row = db.select().from(staff).where(eq(staff.email, email)).get();
    return row ? rowToRecord(row) : null;
  },

  findById(id) {
    const row = db.select().from(staff).where(eq(staff.id, id)).get();
    return row ? rowToRecord(row) : null;
  },

  list() {
    return db.select().from(staff).all().map(rowToRecord);
  },

  delete(id) {
    db.delete(staff).where(eq(staff.id, id)).run();
  },
};
