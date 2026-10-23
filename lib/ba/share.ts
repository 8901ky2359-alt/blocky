// 共有ヘルパー：Web Share API（マルチファイル）＋ canvas比較画像＋DLフォールバック

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [head, body] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(head)?.[1] || 'image/jpeg';
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

export function canShareFiles(files: File[]): boolean {
  if (typeof navigator === 'undefined' || !navigator.share) return false;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare) return nav.canShare({ files });
  return true;
}

export type ShareOutcome = 'shared' | 'downloaded' | 'failed';

// ファイルを共有。非対応ならダウンロードにフォールバック
export async function shareOrDownload(files: File[], text?: string): Promise<ShareOutcome> {
  if (canShareFiles(files)) {
    try {
      await navigator.share({ files, text } as ShareData);
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'shared';
      // 続けてDLフォールバック
    }
  }
  try {
    for (const f of files) downloadFile(f);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ビフォー・アフターを横に並べた1枚の比較画像を作る
export async function buildCompareImage(
  beforeUrl: string,
  afterUrl: string,
  label: string,
): Promise<string> {
  const [b, a] = await Promise.all([loadImg(beforeUrl), loadImg(afterUrl)]);
  const panelW = 800;
  const panelH = Math.round((panelW * 4) / 5); // 5:4
  const gap = 16;
  const labelH = 44;
  const headH = label ? 56 : 0;
  const W = panelW * 2 + gap;
  const H = headH + labelH + panelH;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0f172a'; // slate-900
  ctx.fillRect(0, 0, W, H);

  if (label) {
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 30px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 24, headH / 2);
  }

  drawPanel(ctx, b, 0, headH, panelW, panelH, labelH, 'BEFORE', '#2563eb');
  drawPanel(ctx, a, panelW + gap, headH, panelW, panelH, labelH, 'AFTER', '#059669');

  return canvas.toDataURL('image/jpeg', 0.82);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  labelH: number,
  text: string,
  color: string,
) {
  // ラベル帯
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, labelH);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 16, y + labelH / 2);
  // 画像（5:4にフィット）
  ctx.drawImage(img, x, y + labelH, w, h);
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
