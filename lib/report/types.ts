// 現場ルート報告の型

// PDF由来の現場マスタ（不変）
export type SiteSeed = {
  workNo: string; // 工番（リスト外は物件名を代用）
  name: string; // 物件名称（例: WEST-L-641）
  address: string; // 現場住所
  area: string; // 市町村（グループ用）
  hasKey: boolean; // 鍵の有無
  lat: number;
  lng: number;
  land: number; // 地積(㎡)
  priority: boolean; // 優先(クレーム入電など)
};

// 現場の種類：除草のみ / 防草シートまで
export type SiteType = '除草のみ' | 'シートあり';

// 端末に保存する作業状態
export type SiteProgress = {
  workNo: string;
  siteType?: SiteType; // 未設定なら既定（工番あり=シートあり / リスト外=除草のみ）
  weedDone: boolean; // 除草作業が完了
  done: boolean; // 完工（すべて完了。押すと報告対象から外れる）
  nextWeek: boolean; // 次週予定
  updatedAt: number;
};

export const EMPTY_PROGRESS: Omit<SiteProgress, 'workNo'> = {
  weedDone: false,
  done: false,
  nextWeek: false,
  updatedAt: 0,
};

// 旧モデル(weeding/sheet/thisWeek)からの移行も吸収して正規化する
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeProgress(raw: any): SiteProgress {
  if (!raw || typeof raw !== 'object') return { workNo: '', ...EMPTY_PROGRESS };
  if (raw.weedDone !== undefined) {
    return {
      workNo: String(raw.workNo),
      siteType: raw.siteType,
      weedDone: !!raw.weedDone,
      done: !!raw.done,
      nextWeek: !!raw.nextWeek,
      updatedAt: Number(raw.updatedAt) || 0,
    };
  }
  // 旧モデル → 新モデル
  const weedDone =
    raw.weeding === 'done' || raw.sheet === 'done' || raw.sheet === 'fix' || !!raw.done;
  return {
    workNo: String(raw.workNo),
    siteType: undefined,
    weedDone,
    done: !!raw.done,
    nextWeek: !!raw.nextWeek,
    updatedAt: Number(raw.updatedAt) || 0,
  };
}
