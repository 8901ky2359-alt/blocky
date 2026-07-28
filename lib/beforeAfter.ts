// 現場写真ビフォーアフター ツールのデータ層と画像ユーティリティ
// - 撮影/添付した写真は「5:4の横長」に整えて保存する
// - 作業内容は端末内(IndexedDB)に自動保存し、電波が無くても続けられる
// - 共有はビフォー/アフターの2枚を1セットとしてまとめて渡す（LINE等）

// 写真1枚は圧縮済みJPEGのdataURLで保持する
export type Slot = 'before' | 'after';

export interface Pair {
  id: string;
  before?: string; // 5:4 に整えた作業前写真（dataURL）
  after?: string; // 5:4 に整えた作業後写真（dataURL）
}

export interface Project {
  id: string; // 端末内は 'current' 固定（1案件を編集）
  title: string; // 案件名（現場名など・任意）
  pairs: Pair[];
  updatedAt: number;
}

// ビフォーアフターの縦横比（横長 5:4）
export const RATIO = 5 / 4;

/* ------------------------------------------------------------------ */
/* 画像処理: 5:4 への整形と、2枚を横に並べた1枚の合成                     */
/* ------------------------------------------------------------------ */

// 撮影/選択した画像を中央基準で 5:4（横長）に切り出し、圧縮したdataURLを返す
export async function toFiveByFour(
  dataUrl: string,
  maxWidth = 1600,
  quality = 0.82,
): Promise<string> {
  const img = await loadImage(dataUrl);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) return dataUrl;

  // 元画像から 5:4 の最大領域を中央で切り出す
  let cropW = srcW;
  let cropH = Math.round(cropW / RATIO);
  if (cropH > srcH) {
    cropH = srcH;
    cropW = Math.round(cropH * RATIO);
  }
  const sx = Math.round((srcW - cropW) / 2);
  const sy = Math.round((srcH - cropH) / 2);

  // 出力サイズ（幅を上限にそろえる）
  const outW = Math.min(cropW, maxWidth);
  const outH = Math.round(outW / RATIO);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outW, outH);
  ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, outW, outH);
  try {
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return dataUrl;
  }
}

// ビフォー/アフターを横に並べた比較画像（1枚）を作る。共有時の“おまけ”用途。
export async function buildComparison(
  before: string,
  after: string,
  label = true,
): Promise<string | null> {
  const [b, a] = await Promise.all([loadImage(before), loadImage(after)]);
  const cellW = 1000;
  const cellH = Math.round(cellW / RATIO);
  const gap = 24;
  const band = label ? 64 : 0;
  const pad = 24;
  const W = pad * 2 + cellW * 2 + gap;
  const H = pad * 2 + band + cellH;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#0f172a'; // slate-900 の落ち着いた背景
  ctx.fillRect(0, 0, W, H);

  const drawCell = (im: HTMLImageElement, x: number, text: string, accent: string) => {
    if (label) {
      ctx.fillStyle = accent;
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, pad + band / 2);
    }
    const y = pad + band;
    // 5:4 の枠にきれいに収める
    ctx.drawImage(im, x, y, cellW, cellH);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cellW, cellH);
  };

  drawCell(b, pad, 'BEFORE', '#93c5fd'); // blue-300
  drawCell(a, pad + cellW + gap, 'AFTER', '#6ee7b7'); // emerald-300

  return new Promise((resolve) => {
    try {
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    } catch {
      resolve(null);
    }
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* ------------------------------------------------------------------ */
/* 端末内保存(IndexedDB): 作業途中でも失われないよう自動保存する          */
/* ------------------------------------------------------------------ */

const DB_NAME = 'genba-before-after';
const STORE = 'projects';
const VERSION = 1;
const CURRENT_ID = 'current';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadProject(): Promise<Project | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(CURRENT_ID);
      req.onsuccess = () => resolve((req.result as Project) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function saveProject(project: Omit<Project, 'id' | 'updatedAt'>): Promise<void> {
  try {
    const db = await openDb();
    const row: Project = { ...project, id: CURRENT_ID, updatedAt: Date.now() };
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(row);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    /* 保存に失敗しても操作は継続できるようにする（メモリ上には残る） */
  }
}

export async function clearProject(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(CURRENT_ID);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    /* noop */
  }
}

/* ------------------------------------------------------------------ */
/* 共有・保存ヘルパー                                                    */
/* ------------------------------------------------------------------ */

// dataURL を File 化（共有・ダウンロード用）
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [head, body] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(head)?.[1] || 'image/jpeg';
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

export type ShareOutcome = 'shared' | 'unsupported' | 'failed';

// 複数の画像ファイルを「1セット」としてまとめて共有する（LINE等）。
// Web Share API (Level 2) 対応端末では、2枚以上を一度の操作で送れる。
export async function shareImageFiles(files: File[], title?: string): Promise<ShareOutcome> {
  if (typeof navigator === 'undefined' || !navigator.share) return 'unsupported';
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  const data: ShareData = { files, title } as ShareData;
  if (nav.canShare && !nav.canShare(data)) return 'unsupported';
  try {
    await navigator.share(data);
    return 'shared';
  } catch (err) {
    if ((err as Error).name === 'AbortError') return 'shared';
    return 'failed';
  }
}

// 端末に保存（ダウンロード）。共有が使えない端末やPC向けのフォールバックにも。
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
