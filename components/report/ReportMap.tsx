'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import { SiteSeed, SiteProgress } from '@/lib/report/types';
import { OVERALL_META, overallOf, mapsUrl, statusLabel, typeOf, isReportTarget, codeOf } from '@/lib/report/status';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 全現場を座標でプロット。ピン色＝全体ステータス。タップで除草/シート/施工完了を表示。
export default function ReportMap({
  sites,
  get,
  renderKey,
}: {
  sites: SiteSeed[];
  get: (workNo: string) => SiteProgress;
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
      render(L);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const L = (await import('leaflet')).default;
      render(L);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderKey]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function render(L: any) {
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
      const p = get(s.workNo);
      const ov = overallOf(p);
      const meta = OVERALL_META[ov];
      const ring = s.priority ? '#dc2626' : '#ffffff';
      bounds.push([s.lat, s.lng]);
      const m = L.marker([s.lat, s.lng], { icon: pin(meta.color, ring) });
      const type = typeOf(s, p);
      const row = (label: string, val: string, hi: boolean) =>
        `<div style="display:flex;justify-content:space-between;gap:10px;margin:1px 0">` +
        `<span style="color:#666">${label}</span>` +
        `<span style="font-weight:700;color:${hi ? '#059669' : '#334155'}">${val}</span></div>`;
      const html =
        `<div style="font-size:13px;min-width:190px">` +
        `<div style="font-weight:700">${esc(s.name)}${s.priority ? ' <span style=\"color:#dc2626\">優先</span>' : ''}</div>` +
        `<div style="color:#666;margin:2px 0 4px">工番 ${codeOf(s.workNo) ? esc(s.workNo) : 'なし'}・${esc(s.area)}</div>` +
        `<div style="background:${meta.color};color:#fff;text-align:center;font-weight:700;border-radius:4px;padding:2px 0;margin-bottom:6px">${statusLabel(type, p)}${isReportTarget(p) ? '（報告対象）' : ''}</div>` +
        row('種類', type === '除草のみ' ? '除草のみ' : '防草シートあり', false) +
        row('除草作業', p.weedDone ? '完了' : '未', p.weedDone) +
        row('完工', p.done ? '✅ 完工' : '未', p.done) +
        `<a href="${mapsUrl(s.lat, s.lng)}" target="_blank" rel="noopener" style="display:block;margin-top:6px;color:#1e293b;font-weight:700;text-decoration:underline">🗺 Googleマップで開く</a>` +
        `</div>`;
      m.bindPopup(html, { minWidth: 200, maxWidth: 250 });
      layer.addLayer(m);
    }
    if (bounds.length === 1) map.setView(bounds[0], 14);
    else map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
        {(['done', 'weeded', 'none'] as const).map((k) => (
          <span key={k} className="flex items-center gap-1">
            <i className="inline-block h-3 w-3 rounded-full" style={{ background: OVERALL_META[k].color }} />
            {OVERALL_META[k].label}
          </span>
        ))}
        <span className="ml-auto">{sites.length}件</span>
      </div>
      <div
        ref={mapEl}
        className="h-[66vh] w-full overflow-hidden rounded-xl border border-black/10 bg-brand-soft"
      />
      <p className="text-center text-[11px] text-black/40">
        ピンをタップ → 除草／防草シート／施工完了のステータスとGoogleマップリンクが開きます（地図表示にはネット接続が必要）。
      </p>
    </div>
  );
}
