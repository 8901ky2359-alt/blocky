// 雇用（人工・作業依頼）の型 — シンプル版

export interface HireRecord {
  id: string;
  date: string; // 日付 YYYY-MM-DD
  name: string; // 名前（作業者）
  site: string; // 現場名
  amount: number; // 金額
  memo?: string;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

// 旧データ（rate文字列・worker・dateStart など）を金額数値へ
function parseAmount(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const m = v.match(/[\d,]+/g);
    if (m) return Number(m[m.length - 1].replace(/,/g, '')) || 0;
  }
  return 0;
}

// 旧モデルも吸収して正規化
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeHire(raw: any): HireRecord {
  return {
    id: String(raw?.id ?? Math.random().toString(36).slice(2, 12)),
    date: raw?.date ?? raw?.dateStart ?? '',
    name: raw?.name ?? raw?.worker ?? '',
    site: raw?.site ?? raw?.location ?? '',
    amount: raw?.amount != null ? parseAmount(raw.amount) : parseAmount(raw?.rate),
    memo: raw?.memo ?? '',
    createdAt: Number(raw?.createdAt) || 0,
    updatedAt: Number(raw?.updatedAt) || 0,
    deleted: raw?.deleted,
  };
}
