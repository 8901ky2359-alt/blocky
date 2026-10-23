// Before/After 現場写真アプリの型

import type { SignColor } from '../signboard';

export interface Shot {
  dataUrl: string; // 5:4 に整形・圧縮済みのJPEG
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
