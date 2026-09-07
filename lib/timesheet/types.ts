// 作業日報の型

export type Role = 'admin' | 'worker';

export interface TimesheetUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: number;
}

export type EntryStatus = 'pending' | 'approved';

export interface TimesheetEntry {
  id: string;
  userId: string;
  userName?: string;
  date: string; // YYYY-MM-DD
  site: string;
  workContent: string;
  amount: number;
  memo: string;
  status: EntryStatus;
  adminMemo: string;
  editedByAdmin: boolean;
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: number | null;
  createdAt: number;
  updatedAt: number;
}
