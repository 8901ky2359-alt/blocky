'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import { Entry } from '@/lib/types';
import { yen } from '@/lib/format';

export default function MapView({ entries }: { entries: Entry[] }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);

  // 位置情報を持つ記録だけ
  const located = useMemo(
    () => entries.filter((e) => typeof e.lat === 'number' && typeof e.lng === 'number'),
    [entries],
  );

  // 地図の初期化（クライアントのみ・1回だけ）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapEl.current || mapRef.current) return;

      const map = L.map(mapEl.current, { center: [36.5, 137.5], zoom: 5 });
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

  // ピンの再描画
  useEffect(() => {
    (async () => {
      const L = (await import('leaflet')).default;
      renderMarkers(L);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [located]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderMarkers(L: any) {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (located.length === 0) return;

    const pin = (color: string) =>
      L.divIcon({
        className: '',
        html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 22],
        popupAnchor: [0, -20],
      });

    const bounds: [number, number][] = [];
    for (const e of located) {
      const lat = e.lat as number;
      const lng = e.lng as number;
      bounds.push([lat, lng]);
      const marker = L.marker([lat, lng], { icon: pin('#1f7a4f') });
      marker.bindPopup(buildPopup(e), { minWidth: 200, maxWidth: 260 });
      layer.addLayer(marker);
    }
    if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    } else {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">現場マップ（実績）</h2>
        <span className="text-sm text-black/50">{located.length}件</span>
      </div>

      <div
        ref={mapEl}
        className="h-[62vh] w-full overflow-hidden rounded-xl border border-black/10 bg-brand-soft"
      />

      {located.length === 0 && (
        <p className="rounded-xl border border-dashed border-black/15 p-4 text-center text-sm text-black/50">
          まだ地図に登録された現場がありません。<br />
          記録するとき「住所」を入れて「地図に登録」すると、ここにピンが立ちます。
        </p>
      )}
      <p className="text-center text-xs text-black/40">
        ピンをタップすると、現場名・単価・作業前後の写真が見られます。
      </p>
    </div>
  );
}

// ポップアップの中身（現場名・単価・日付・Before/After写真）
function buildPopup(e: Entry): HTMLElement {
  const el = document.createElement('div');
  el.style.fontSize = '13px';

  const title = document.createElement('div');
  title.style.fontWeight = '700';
  title.style.marginBottom = '2px';
  title.textContent = e.site || '（現場名なし）';
  el.appendChild(title);

  const meta = document.createElement('div');
  meta.style.color = '#555';
  meta.style.marginBottom = '6px';
  meta.textContent = `${e.date}　${e.kind === 'income' ? yen(e.amount) : '（経費）'}`;
  el.appendChild(meta);

  const before = e.photos.filter((p) => p.photoKind === 'site' && p.phase === 'before');
  const after = e.photos.filter((p) => p.photoKind === 'site' && p.phase === 'after');
  const others = e.photos.filter((p) => p.photoKind === 'site' && p.phase !== 'before' && p.phase !== 'after');

  const addThumbs = (label: string, list: typeof e.photos) => {
    if (list.length === 0) return;
    const lab = document.createElement('div');
    lab.style.fontSize = '11px';
    lab.style.color = '#888';
    lab.textContent = label;
    el.appendChild(lab);
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '4px';
    row.style.marginBottom = '4px';
    for (const p of list.slice(0, 3)) {
      const img = document.createElement('img');
      img.src = p.dataUrl;
      img.style.width = '56px';
      img.style.height = '56px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '6px';
      row.appendChild(img);
    }
    el.appendChild(row);
  };

  addThumbs('作業前', before);
  addThumbs('作業後', after);
  addThumbs('現場', others);

  if (e.memo) {
    const memo = document.createElement('div');
    memo.style.color = '#444';
    memo.style.marginTop = '2px';
    memo.textContent = e.memo;
    el.appendChild(memo);
  }
  return el;
}
