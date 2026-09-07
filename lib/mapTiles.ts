// 地図タイルの共通設定（複数ページで使用）
// 標準地図: OpenStreetMap（無料・登録不要・見慣れた配色）
// 航空写真: 国土地理院（日本国内の航空写真。OSMには同等の無料タイルが無いため継続利用）

export const STD_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const STD_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';

export const PHOTO_URL = 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg';
export const PHOTO_ATTRIBUTION =
  "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル（航空写真）</a>";

export const MAP_MAX_ZOOM = 18;
