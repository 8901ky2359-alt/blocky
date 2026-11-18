// Before/After 現場写真アプリの型

import type { SignColor } from '../signboard';

// 写真は1枚ずつ IndexedDB に保存し、ここには ID だけ持つ（100枚を超えても保存が重くならないように）。
// thumb は一覧に出す小さい画像の object URL（端末の中だけ・保存はしない）
export interface Shot {
  id: string;
  thumb?: string;
}

export interface Item {
  before: Shot | null;
  after: Shot | null;
}

// 看板を写真に入れる場合の設定（入れない場合は Project.sign が null）
export interface SignSettings {
  title: string; // 工事名
  place: string; // 場所
  color: SignColor;
  startNo: number; // 1番目の箇所の看板番号
  beforeKind: string; // ビフォーの看板に縦書きで入れる文字（例: 除草前）
  afterKind: string; // アフターの看板（例: 除草後）
}

export interface Project {
  name: string; // 案件名（現場名）任意
  count: number; // 箇所数
  items: Item[];
  sign?: SignSettings | null;
  updatedAt: number;
}

export function emptyItems(count: number): Item[] {
  return Array.from({ length: count }, () => ({ before: null, after: null }));
}
