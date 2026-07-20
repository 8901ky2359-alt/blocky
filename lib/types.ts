// アプリ全体で使うデータの型定義

export type EntryKind = 'income' | 'expense';

export type PhotoKind = 'receipt' | 'site';

// 現場写真の作業前/後（Before/After比較用）
export type PhotoPhase = 'before' | 'after' | 'none';

// 写真1枚
export interface Photo {
  id: string;
  photoKind: PhotoKind; // レシート or 現場
  phase?: PhotoPhase; // 現場写真のみ: 作業前/後
  dataUrl: string; // 端末内保存では画像そのもの（圧縮済みJPEG）。クラウド化時はURLが入る
  caption?: string;
}

// 記録1件（収入・経費・現場写真をまとめて表す）
export interface Entry {
  id: string;
  date: string; // YYYY-MM-DD
  kind: EntryKind;
  category: string;
  site: string; // 現場名
  amount: number; // 円
  memo: string;
  photos: Photo[];
  address?: string; // 現場の住所（地図マッピング用）
  lat?: number; // 緯度（住所検索で自動取得）
  lng?: number; // 経度
  workType?: WorkType; // 常駐 / 請負
  createdAt: number;
  updatedAt: number;
}

export type WorkType = '常駐' | '請負';

// 記録の区分を判定（未設定の旧データはメモから推定、既定は請負）
export function workTypeOf(e: { workType?: WorkType; memo?: string }): WorkType {
  if (e.workType) return e.workType;
  if (e.memo && e.memo.includes('常駐')) return '常駐';
  return '請負';
}

// 収入カテゴリ
export const INCOME_CATEGORIES = ['草刈り作業', '運搬・軽トラ作業', 'その他収入'] as const;

// 経費カテゴリ（軽トラ関連を厚めに）
export const EXPENSE_CATEGORIES = [
  '燃料（ガソリン）',
  '軽トラ整備・オイル',
  '車検',
  '自動車保険',
  '高速・駐車',
  '刈払機・道具',
  '消耗品（刃・燃料混合等）',
  'ゴミ処分費',
  'その他経費',
] as const;

export function categoriesFor(kind: EntryKind): readonly string[] {
  return kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

// 定型作業テンプレート（ボタン1つで入力を呼び出す）
export interface Template {
  id: string;
  label: string; // ボタンに表示する名前
  kind: EntryKind;
  category: string;
  amount: number;
  memo: string;
}
