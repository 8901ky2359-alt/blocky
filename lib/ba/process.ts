// 撮った写真の処理：5:4 に切り出し → （看板ありなら）左下に看板 → 元の画質の JPEG と一覧用の小さい JPEG を作る。
// data URL（文字列）を経由せず canvas から直接ファイルにするので、速くてメモリも少なくて済む

import { drawSignboard, signboardHeight, SignColor, SignFields } from '../signboard';

const RATIO = 5 / 4; // 横:縦
const THUMB_W = 480; // 一覧に出す小さい画像の幅
const BOARD_W_RATIO = 0.34; // 看板の幅（写真の幅に対する割合）

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode-failed'))), 'image/jpeg', quality),
  );
}

// canvas のメモリを早めに手放す（iPhone は canvas の合計サイズに上限がある）
function release(c: HTMLCanvasElement) {
  c.width = 0;
  c.height = 0;
}

async function thumbFrom(src: CanvasImageSource, w: number, h: number): Promise<Blob> {
  const tw = Math.min(THUMB_W, w);
  const c = document.createElement('canvas');
  c.width = tw;
  c.height = Math.round((tw * h) / w);
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
  const b = await toBlob(c, 0.72);
  release(c);
  return b;
}

export async function processShot(
  file: Blob,
  maxW: number,
  quality: number,
  sign?: { fields: SignFields; color: SignColor } | null,
): Promise<{ full: Blob; thumb: Blob }> {
  const src = await loadImage(file);
  const sw = src.naturalWidth || src.width;
  const sh = src.naturalHeight || src.height;
  if (!sw || !sh) throw new Error('invalid image');

  // 中央基準で 5:4 に切り出す（縦向きで撮っても横長に）
  let cropW = sw;
  let cropH = sw / RATIO;
  if (sw / sh > RATIO) {
    cropH = sh;
    cropW = sh * RATIO;
  }
  const cx = (sw - cropW) / 2;
  const cy = (sh - cropH) / 2;
  const outW = Math.min(maxW, Math.round(cropW));
  const outH = Math.round(outW / RATIO);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  ctx.drawImage(src, cx, cy, cropW, cropH, 0, 0, outW, outH);
  if (sign) {
    const bw = outW * BOARD_W_RATIO;
    drawSignboard(ctx, 0, outH - signboardHeight(bw), bw, sign.fields, false, sign.color);
  }
  const full = await toBlob(canvas, quality);
  const thumb = await thumbFrom(canvas, outW, outH);
  release(canvas);
  return { full, thumb };
}

// 保存済みの写真から一覧用の小さい画像を作る（以前の形からの移し替え用）
export async function makeThumb(full: Blob): Promise<Blob> {
  const img = await loadImage(full);
  return thumbFrom(img, img.naturalWidth, img.naturalHeight);
}
