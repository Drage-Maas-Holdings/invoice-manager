import { db } from '../db/client';
import { vendor } from '../db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { VendorRecord, VendorRepository } from './vendor';

function rowToRecord(row: typeof vendor.$inferSelect): VendorRecord {
  return {
    id: row.id,
    name: row.name,
    passcode_hash: row.passcode_hash,
    contact_email: row.contact_email,
    created_at: row.created_at,
  };
}

export const vendorRepository: VendorRepository = {
  create(data) {
    const id = data.id ?? randomUUID();
    const now = new Date();
    db.insert(vendor).values({
      id,
      name: data.name,
      passcode_hash: data.passcode_hash,
      contact_email: data.contact_email,
      created_at: now,
    }).run();
    return { ...data, id, created_at: now };
  },

  findByName(name) {
    const row = db.select().from(vendor).where(eq(vendor.name, name)).get();
    return row ? rowToRecord(row) : null;
  },

  findById(id) {
    const row = db.select().from(vendor).where(eq(vendor.id, id)).get();
    return row ? rowToRecord(row) : null;
  },

  list() {
    return db.select().from(vendor).all().map(rowToRecord);
  },

  delete(id) {
    db.delete(vendor).where(eq(vendor.id, id)).run();
  },
};
