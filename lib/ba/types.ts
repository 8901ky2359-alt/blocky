// Before/After 現場写真アプリの型

export interface Shot {
  dataUrl: string; // 5:4 に整形・圧縮済みのJPEG
}

export interface Item {
  before: Shot | null;
  after: Shot | null;
}

export interface Project {
  name: string; // 案件名（現場名）任意
  count: number; // 箇所数
  items: Item[];
  updatedAt: number;
}

export function emptyItems(count: number): Item[] {
  return Array.from({ length: count }, () => ({ before: null, after: null }));
}
