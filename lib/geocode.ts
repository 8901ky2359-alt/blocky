// 住所 → 緯度経度 の変換（国土地理院の住所検索API・無料・キー不要）
// 例: https://msearch.gsi.go.jp/address-search/AddressSearch?q=東京都千代田区

export interface GeoResult {
  lat: number;
  lng: number;
  matched: string; // ヒットした住所表記
}

export async function geocodeAddress(address: string, timeoutMs = 7000): Promise<GeoResult | null> {
  const q = address.trim();
  if (!q) return null;
  const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(q)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      geometry: { coordinates: [number, number] };
      properties: { title: string };
    }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const [lng, lat] = data[0].geometry.coordinates;
    return { lat, lng, matched: data[0].properties?.title ?? q };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
