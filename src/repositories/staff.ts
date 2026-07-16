export interface StaffRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

export interface CreateStaffData {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
}

export interface StaffRepository {
  create(data: CreateStaffData): StaffRecord;
  findByEmail(email: string): StaffRecord | null;
  findById(id: string): StaffRecord | null;
  list(): StaffRecord[];
  delete(id: string): void;
}
