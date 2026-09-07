// Before/After 現場写真アプリの型
// v2: 単一プロジェクト → 複数現場（一覧・地図管理）に対応

export interface Shot {
  dataUrl: string; // 5:4 に整形・圧縮済みのJPEG
}

export interface Item {
  before: Shot | null;
  after: Shot | null;
}

export interface Project {
  id: string;
  name: string; // 現場名
  address: string; // 住所（座標入力・地図登録用）
  lat?: number;
  lng?: number;
  startDate: string; // 作業開始日 YYYY-MM-DD
  count: number; // 箇所数
  items: Item[];
  showSign: boolean; // 看板（管理看板）を写真に入れるか
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export function emptyItems(count: number): Item[] {
  return Array.from({ length: count }, () => ({ before: null, after: null }));
}

export function doneCount(p: Project): number {
  return p.items.filter((it) => it.before && it.after).length;
}

// 箇所が1つ以上あり、すべて完了＝施工完了
export function isProjectDone(p: Project): boolean {
  return p.items.length > 0 && doneCount(p) === p.items.length;
}

// 旧データ（単一プロジェクト時代）や欠けたフィールドを補って正規化する
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeProject(raw: any): Project {
  const count = Number(raw?.count) || 0;
  const items: Item[] = Array.isArray(raw?.items) && raw.items.length > 0 ? raw.items : emptyItems(count);
  const now = Date.now();
  return {
    id: String(raw?.id ?? `${now}-${Math.random().toString(36).slice(2, 8)}`),
    name: raw?.name ?? '',
    address: raw?.address ?? '',
    lat: typeof raw?.lat === 'number' ? raw.lat : undefined,
    lng: typeof raw?.lng === 'number' ? raw.lng : undefined,
    startDate: raw?.startDate ?? '',
    count: items.length,
    items,
    showSign: !!raw?.showSign,
    createdAt: Number(raw?.createdAt) || now,
    updatedAt: Number(raw?.updatedAt) || now,
    deleted: !!raw?.deleted,
  };
}
