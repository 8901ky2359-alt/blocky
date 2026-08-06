// 現場ルート報告の型

// PDF由来の現場マスタ（不変）
export type SiteSeed = {
  workNo: string; // 工番
  name: string; // 物件名称（例: WEST-L-641）
  address: string; // 現場住所
  area: string; // 市町村（グループ用）
  hasKey: boolean; // 鍵の有無
  lat: number;
  lng: number;
  land: number; // 地積(㎡)
  priority: boolean; // 優先(クレーム入電など)
};

// 除草の進捗
export type Weeding = 'none' | 'wip' | 'done'; // 未着手 / 作業途中 / 完了
// 防草シートの進捗
export type Sheet = 'none' | 'wip' | 'done' | 'fix'; // 未着手 / 作業途中 / 完了 / 是正個所未完

// 端末に保存する作業状態
export type SiteProgress = {
  workNo: string;
  weeding: Weeding;
  sheet: Sheet;
  done: boolean; // 施工完了
  thisWeek: boolean; // 今週実施（報告の「実施」に載せる）
  nextWeek: boolean; // 次週予定（報告の「次週」に載せる）
  note?: string;
  updatedAt: number;
};

export const EMPTY_PROGRESS: Omit<SiteProgress, 'workNo'> = {
  weeding: 'none',
  sheet: 'none',
  done: false,
  thisWeek: false,
  nextWeek: false,
  updatedAt: 0,
};
