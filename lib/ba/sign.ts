// 5:4 に整えた写真の左下に看板を合成する（看板あり の撮影用）

import { drawSignboard, signboardHeight, SignColor, SignFields } from '../signboard';

// 看板の幅（写真の幅に対する割合）。看板入り写真撮影と同じ大きさ
const BOARD_W_RATIO = 0.34;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function addSign(dataUrl: string, fields: SignFields, color: SignColor, quality: number): Promise<string> {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  ctx.drawImage(img, 0, 0, w, h);
  const bw = w * BOARD_W_RATIO;
  drawSignboard(ctx, 0, h - signboardHeight(bw), bw, fields, false, color);
  return canvas.toDataURL('image/jpeg', quality);
}
