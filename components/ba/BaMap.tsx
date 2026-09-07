'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap, LayerGroup, TileLayer } from 'leaflet';
import { Project, doneCount, isProjectDone } from '@/lib/ba/types';
import { formatJpDate } from '@/lib/format';

const STD_URL = 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png';
const PHOTO_URL = 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg';

export default function BaMap({ projects, onOpen }: { projects: Project[]; onOpen: (p: Project) => void }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const tileRef = useRef<TileLayer | null>(null);
  const [photo, setPhoto] = useState(false);

  const located = useMemo(
    () => projects.filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number'),
    [projects],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapEl.current || mapRef.current) return;
      const map = L.map(mapEl.current, { center: [36.5, 137.5], zoom: 5 });
      tileRef.current = L.tileLayer(photo ? PHOTO_URL : STD_URL, {
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
  }, [located]);

  useEffect(() => {
    if (tileRef.current) tileRef.current.setUrl(photo ? PHOTO_URL : STD_URL);
  }, [photo]);

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
    for (const p of located) {
      const lat = p.lat as number;
      const lng = p.lng as number;
      bounds.push([lat, lng]);
      const done = isProjectDone(p);
      const marker = L.marker([lat, lng], { icon: pin(done ? '#059669' : '#f59e0b') });
      marker.bindPopup(buildPopup(p, done), { minWidth: 200, maxWidth: 260 });
      marker.on('click', () => {
        // ポップアップ内の「開く」ボタンからも遷移できるよう data 属性で紐付ける
      });
      layer.addLayer(marker);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`ba-open-${p.id}`);
        if (btn) btn.onclick = () => onOpen(p);
      });
    }
    if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    } else {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }

  function buildPopup(p: Project, done: boolean): HTMLElement {
    const el = document.createElement('div');
    el.style.fontSize = '13px';

    const badge = document.createElement('div');
    badge.style.display = 'inline-block';
    badge.style.marginBottom = '4px';
    badge.style.padding = '1px 8px';
    badge.style.borderRadius = '999px';
    badge.style.fontSize = '11px';
    badge.style.fontWeight = '700';
    badge.style.color = '#fff';
    badge.style.background = done ? '#059669' : '#f59e0b';
    badge.textContent = done ? '✓ 施工完了' : `進行中 ${doneCount(p)}/${p.items.length}`;
    el.appendChild(badge);

    const title = document.createElement('div');
    title.style.fontWeight = '700';
    title.style.marginBottom = '2px';
    title.textContent = p.name || '（現場名なし）';
    el.appendChild(title);

    if (p.startDate) {
      const meta = document.createElement('div');
      meta.style.color = '#555';
      meta.style.marginBottom = '6px';
      meta.textContent = formatJpDate(p.startDate);
      el.appendChild(meta);
    }

    const thumbs = p.items.filter((it) => it.before || it.after).slice(0, 3);
    if (thumbs.length > 0) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '4px';
      row.style.marginBottom = '6px';
      for (const it of thumbs) {
        const url = it.after?.dataUrl || it.before?.dataUrl;
        if (!url) continue;
        const img = document.createElement('img');
        img.src = url;
        img.style.width = '56px';
        img.style.height = '56px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '6px';
        row.appendChild(img);
      }
      el.appendChild(row);
    }

    const btn = document.createElement('button');
    btn.id = `ba-open-${p.id}`;
    btn.textContent = 'この現場を開く';
    btn.style.width = '100%';
    btn.style.padding = '6px 0';
    btn.style.background = '#0f1b2d';
    btn.style.color = '#fff';
    btn.style.fontWeight = '700';
    btn.style.fontSize = '12px';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    el.appendChild(btn);

    return el;
  }

  return (
    <div className="space-y-3 pb-4">
      <div className="flex overflow-hidden border border-slate-300">
        <button
          onClick={() => setPhoto(false)}
          className={`flex-1 py-2 text-xs font-bold ${!photo ? 'bg-brand-accent text-white' : 'bg-white text-slate-500'}`}
        >
          🗺 標準地図
        </button>
        <button
          onClick={() => setPhoto(true)}
          className={`flex-1 border-l border-slate-300 py-2 text-xs font-bold ${photo ? 'bg-brand-accent text-white' : 'bg-white text-slate-500'}`}
        >
          🛰 航空写真
        </button>
      </div>

      <div ref={mapEl} className="h-[62vh] w-full overflow-hidden border border-black/10 bg-brand-soft" />

      {located.length === 0 && (
        <p className="rounded-sm border border-dashed border-black/15 p-4 text-center text-sm text-black/50">
          まだ地図に登録された現場がありません。
          <br />
          記録するとき「住所」を入れて検索すると、ここにピンが立ちます。
        </p>
      )}
      <p className="text-center text-xs text-black/40">
        🟢 施工完了　🟠 進行中　／　ピンをタップして現場を開けます
      </p>
    </div>
  );
}
