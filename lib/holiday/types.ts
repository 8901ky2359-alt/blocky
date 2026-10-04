// 日付のマーク（休み／ー）の型。日付ごとに1件、収支カレンダーに表示する。
// kind='off' = お休み／kind='skip' = ー（複数日にまたがる作業で、この日は別記録なし）

export type DayMarkKind = 'off' | 'skip';

export interface Holiday {
  id: string; // = date（1日1件）
  date: string; // YYYY-MM-DD
  kind: DayMarkKind;
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
    kind: raw?.kind === 'skip' ? 'skip' : 'off',
    memo: raw?.memo ?? undefined,
    createdAt: Number(raw?.createdAt) || 0,
    updatedAt: Number(raw?.updatedAt) || 0,
    deleted: !!raw?.deleted,
  };
}
