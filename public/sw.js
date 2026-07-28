/* 現場家計簿 / ビフォーアフター 共通のサービスワーカー
 * 目的: 電波の悪い現場でも、一度開いたアプリはオフラインで起動できるようにする。
 * 方針:
 *  - ナビゲーション(HTML)は network-first（新しければ更新、圏外ならキャッシュ）
 *  - 静的アセット(JS/CSS/画像等)は cache-first（速く・オフラインでも動く）
 */
const CACHE = 'genba-app-v1';
const APP_SHELL = ['/', '/before-after', '/manifest.json', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 外部（地図タイル等）は素通し

  // ページ遷移: network-first
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/'))),
    );
    return;
  }

  // それ以外の同一オリジン資産: cache-first（無ければ取得してキャッシュ）
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
            }
            return res;
          })
          .catch(() => cached),
    ),
  );
});
