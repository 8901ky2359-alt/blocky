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

// 売上の区分（作業員手配＝人を手配して請求する分。旧アプリの「雇用」）
// 表示の順番も兼ねる（請負 → 常駐 → 作業員手配）
export const WORK_TYPES = ['請負', '常駐', '作業員手配'] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export interface SaleInput extends Terms {
  date: string; // YYYY-MM-DD
  site: string;
  work: string;
  amount: number; // 税抜
  memo: string;
  clientName: string;
  workType: WorkType;
  hiredName: string; // 作業員手配のときの作業員名
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
