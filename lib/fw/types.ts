// Field Watch の型

export type Role = 'admin' | 'worker';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: number;
}

// 締め日・入金日（31 = 月末）。payOffset は締めた月から何か月後に入金か（0=当月,1=翌月,2=翌々月）
export interface Terms {
  cutoff: number;
  payOffset: number;
  payDay: number;
}

export interface Client extends Terms {
  id: string;
  name: string;
}

export type SaleStatus = 'pending' | 'approved';

export interface SaleInput extends Terms {
  date: string; // YYYY-MM-DD
  site: string;
  work: string;
  amount: number; // 税抜
  memo: string;
  clientName: string;
}

export interface Sale extends SaleInput {
  id: string;
  userId: string;
  userName: string;
  status: SaleStatus;
  approvedAt: number | null;
  paid: boolean;
  paidAt: number | null;
  createdAt: number;
  updatedAt: number;
}

// 請求書の発行者情報（各自）
export interface Profile {
  issuerName: string;
  tradeName: string;
  address: string;
  phone: string;
  bank: string;
  invoiceNo: string;
}
