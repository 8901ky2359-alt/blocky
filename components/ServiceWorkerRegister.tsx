'use client';

import { useEffect } from 'react';

// アプリ起動時にサービスワーカーを登録し、オフラインでも起動できるようにする。
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* 登録に失敗してもアプリは通常通り動く */
      });
    };
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
