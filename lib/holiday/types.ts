// 休み（お休み）の型。日付ごとに1件、収支カレンダーに表示する。

export interface Holiday {
  id: string; // = date（1日1件）
  date: string; // YYYY-MM-DD
  memo?: string; // 任意メモ（例: 雨天・私用）
  createdAt: number;
  updatedAt: number;
  deleted?: boolean; // 削除済み（同期用の墓標）
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeHoliday(raw: any): Holiday {
  return {
    id: String(raw?.id ?? raw?.date ?? ''),
    date: String(raw?.date ?? raw?.id ?? ''),
    memo: raw?.memo ?? undefined,
    createdAt: Number(raw?.createdAt) || 0,
    updatedAt: Number(raw?.updatedAt) || 0,
    deleted: !!raw?.deleted,
  };
}
