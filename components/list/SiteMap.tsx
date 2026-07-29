'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import { SiteSeed } from '@/lib/list/types';

function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

// 全現場を座標でプロットする地図。完了=緑／未完了=灰／優先=赤枠。
export default function SiteMap({
  sites,
  isDone,
  renderKey,
}: {
  sites: SiteSeed[];
  isDone: (workNo: string) => boolean;
  renderKey: string;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapEl.current || mapRef.current) return;
      const map = L.map(mapEl.current, { center: [36.3, 140.1], zoom: 9 });
      L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
        attribution:
          "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>",
        maxZoom: 18,
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      renderMarkers(L);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const L = (await import('leaflet')).default;
      renderMarkers(L);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderKey]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderMarkers(L: any) {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (sites.length === 0) return;

    const pin = (fill: string, ring: string) =>
      L.divIcon({
        className: '',
        html: `<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;background:${fill};transform:rotate(-45deg);border:2px solid ${ring};box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 20],
        popupAnchor: [0, -18],
      });

    const bounds: [number, number][] = [];
    for (const s of sites) {
      const done = isDone(s.workNo);
      const fill = done ? '#059669' : '#64748b'; // 緑 or 灰
      const ring = s.priority ? '#dc2626' : '#ffffff'; // 優先=赤枠
      bounds.push([s.lat, s.lng]);
      const m = L.marker([s.lat, s.lng], { icon: pin(fill, ring) });
      const html =
        `<div style="font-size:13px;min-width:180px">` +
        `<div style="font-weight:700">${esc(s.name)}${s.priority ? ' <span style=\"color:#dc2626\">優先</span>' : ''}</div>` +
        `<div style="color:#666;margin:2px 0">工番 ${esc(s.workNo)}</div>` +
        `<div style="color:#444;margin-bottom:4px">${esc(s.address)}</div>` +
        `<div style="margin-bottom:6px">${done ? '✅ 作業完了' : '⬜ 未完了'}　鍵${s.hasKey ? '有' : '無'}</div>` +
        `<a href="${mapsUrl(s.lat, s.lng)}" target="_blank" rel="noopener" style="color:#1e293b;font-weight:700;text-decoration:underline">🗺 Googleマップで開く</a>` +
        `</div>`;
      m.bindPopup(html, { minWidth: 190, maxWidth: 240 });
      layer.addLayer(m);
    }
    if (bounds.length === 1) map.setView(bounds[0], 14);
    else map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <i className="inline-block h-3 w-3 rounded-full" style={{ background: '#059669' }} />完了
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-3 w-3 rounded-full" style={{ background: '#64748b' }} />未完了
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-3 w-3 rounded-full border-2 border-red-600" style={{ background: '#64748b' }} />優先
        </span>
        <span className="ml-auto">{sites.length}件を表示</span>
      </div>
      <div
        ref={mapEl}
        className="h-[68vh] w-full overflow-hidden rounded-xl border border-black/10 bg-brand-soft"
      />
      <p className="text-center text-[11px] text-black/40">
        ピンをタップ → 現場情報とGoogleマップへのリンクが開きます（地図の表示にはネット接続が必要です）。
      </p>
    </div>
  );
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
