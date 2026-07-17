export interface VendorRecord {
  id: string;
  name: string;
  passcode_hash: string;
  contact_email: string;
  created_at: Date;
}

export interface CreateVendorData {
  id?: string;
  name: string;
  passcode_hash: string;
  contact_email: string;
}

export interface VendorRepository {
  create(data: CreateVendorData): VendorRecord;
  findByName(name: string): VendorRecord | null;
  findById(id: string): VendorRecord | null;
  list(): VendorRecord[];
  delete(id: string): void;
}
