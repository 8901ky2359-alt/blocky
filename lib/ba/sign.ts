// 管理看板画像（1枚だけ端末に登録し、以後どの現場でも使い回す）
// 「看板を入れる」がONの写真に、左下へ少し小さめに重ねて表示・保存する。

const DB_NAME = 'ba-sign';
const STORE = 'asset';
const KEY = 'default';
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no idb'));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getSignImage(): Promise<string | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function setSignImage(dataUrl: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(dataUrl, KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearSignImage(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    /* noop */
  }
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// 看板画像を写真の左下に、幅の約28%くらいの大きさで重ねる
export async function composeSignboard(baseDataUrl: string, signDataUrl: string): Promise<string> {
  const [base, sign] = await Promise.all([loadImg(baseDataUrl), loadImg(signDataUrl)]);
  const canvas = document.createElement('canvas');
  canvas.width = base.naturalWidth || base.width;
  canvas.height = base.naturalHeight || base.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return baseDataUrl;
  ctx.drawImage(base, 0, 0, canvas.width, canvas.height);

  const margin = Math.round(canvas.width * 0.03);
  const signW = Math.round(canvas.width * 0.28);
  const signRatio = (sign.naturalHeight || sign.height) / (sign.naturalWidth || sign.width);
  const signH = Math.round(signW * signRatio);
  const x = margin;
  const y = canvas.height - signH - margin;

  // 視認性のための白フチ＋影
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.45)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#fff';
  const pad = Math.max(2, Math.round(canvas.width * 0.004));
  ctx.fillRect(x - pad, y - pad, signW + pad * 2, signH + pad * 2);
  ctx.restore();
  ctx.drawImage(sign, x, y, signW, signH);

  return canvas.toDataURL('image/jpeg', 0.88);
}
