// 雇用（作業依頼・業務委託）管理の型

export interface HireRecord {
  id: string;
  orderer: string; // 発注者名（基本は山田一貴）
  worker: string; // 作業者名
  workContent: string; // 作業内容
  location: string; // 作業場所
  dateStart: string; // 作業日・開始（YYYY-MM-DD）
  dateEnd?: string; // 期間の終了（任意）
  rate: string; // 報酬額（例: 1人工 20,000円）
  paymentTerms: string; // 支払条件（例: 月末締め翌月末払い）
  travelLodging: string; // 交通費・宿泊費の負担
  ordererSign?: string; // 発注者の署名（dataURL）
  workerSign?: string; // 作業者の署名（dataURL）
  ordererConfirmed?: boolean; // 発注者の確認
  workerConfirmed?: boolean; // 作業者の確認
  memo?: string;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export const DEFAULT_ORDERER = '山田一貴';
export const DEFAULT_PAYMENT_TERMS = '月末締め翌月末払い';
