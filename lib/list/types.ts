// 現場リスト（防草シート）の型

// PDF由来の現場マスタ（不変）
export type SiteSeed = {
  workNo: string; // 工番
  name: string; // 物件名称
  address: string; // 現場住所
  hasKey: boolean; // 鍵の有無
  lat: number;
  lng: number;
  area: number; // 地積(㎡)
  priority: boolean; // 優先(クレーム入電など)
};

// 端末に保存する作業状態（完了フラグ・写真）
export type SiteState = {
  workNo: string;
  done: boolean; // 作業完了
  doneAt?: number; // 完了日時
  before: string[]; // ビフォー写真(dataURL)
  after: string[]; // アフター写真(dataURL)
  updatedAt: number;
};
