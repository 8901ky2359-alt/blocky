// 現場写真に合成する「看板」を Canvas に描画するヘルパー。
// 工事名・場所・種別（除草前/除草後などを縦書き）・通し番号（丸囲み）を白地の看板として描く。

export interface SignFields {
  title: string; // 工事名
  place: string; // 場所
  kind: string; // 種別（例: 除草前 / 除草後）縦書きで表示
  no: number; // 通し番号（丸囲み）
}

// 看板の縦横比（高さ = 幅 × RATIO）
export const SIGN_RATIO = 0.7;
// 看板下の自撮り棒（スタンド）の高さ比（幅に対して）
export const STAND_RATIO = 0.32;

export function signboardHeight(w: number): number {
  return w * SIGN_RATIO;
}

// 看板＋スタンドを含む全体の高さ
export function assemblyHeight(w: number): number {
  return w * (SIGN_RATIO + STAND_RATIO);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// 看板の下に自撮り棒（持ち手のスタンド）を描く
function drawStand(ctx: CanvasRenderingContext2D, x: number, boardBottom: number, w: number): void {
  const poleW = w * 0.055;
  const poleH = w * STAND_RATIO;
  const poleX = x + w * 0.32 - poleW / 2;
  ctx.save();
  ctx.fillStyle = '#111111';
  // 看板と棒をつなぐクランプ（少し太い横バー）
  const clampW = w * 0.17;
  const clampH = w * 0.05;
  roundRect(ctx, poleX + poleW / 2 - clampW / 2, boardBottom - clampH * 0.2, clampW, clampH, clampH * 0.4);
  ctx.fill();
  // 棒
  roundRect(ctx, poleX, boardBottom + clampH * 0.4, poleW, poleH, poleW * 0.45);
  ctx.fill();
  // 持ち手（先端の少し太いグリップ）
  const gripW = poleW * 1.9;
  const gripH = poleH * 0.34;
  roundRect(ctx, poleX + poleW / 2 - gripW / 2, boardBottom + clampH * 0.4 + poleH - gripH, gripW, gripH, gripW * 0.45);
  ctx.fill();
  ctx.restore();
}

// 指定位置(x,y)に幅wの看板を描く（withStand=trueで下に自撮り棒を付ける）
export function drawSignboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  f: SignFields,
  withStand = false,
): void {
  if (withStand) drawStand(ctx, x, y + signboardHeight(w), w);
  const rowH = w * 0.15; // 工事名/場所の行の高さ
  const bodyH = w * 0.4; // 種別＋番号エリアの高さ
  const h = rowH * 2 + bodyH; // = w * 0.70
  const labelW = w * 0.3; // 左のラベル列の幅

  ctx.save();

  // 背景（白）と外枠
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#111111';
  ctx.lineJoin = 'miter';
  ctx.lineWidth = Math.max(2, w * 0.01);
  ctx.strokeRect(x, y, w, h);

  // 罫線
  ctx.lineWidth = Math.max(1, w * 0.006);
  ctx.beginPath();
  ctx.moveTo(x, y + rowH);
  ctx.lineTo(x + w, y + rowH); // 工事名/場所の間
  ctx.moveTo(x, y + rowH * 2);
  ctx.lineTo(x + w, y + rowH * 2); // ヘッダー/本体の間
  ctx.moveTo(x + labelW, y);
  ctx.lineTo(x + labelW, y + h); // ラベル列の縦線
  ctx.stroke();

  ctx.fillStyle = '#111111';
  ctx.textBaseline = 'middle';

  // ラベル（工事名 / 場所）
  ctx.textAlign = 'center';
  ctx.font = `${rowH * 0.42}px sans-serif`;
  ctx.fillText('工事名', x + labelW / 2, y + rowH * 0.5);
  ctx.fillText('場所', x + labelW / 2, y + rowH * 1.5);

  // 値（左寄せ・はみ出す場合は縮小）
  ctx.textAlign = 'left';
  const padX = w * 0.03;
  drawFit(ctx, f.title, x + labelW + padX, y + rowH * 0.5, w - labelW - padX * 2, rowH * 0.55);
  drawFit(ctx, f.place, x + labelW + padX, y + rowH * 1.5, w - labelW - padX * 2, rowH * 0.55);

  // 種別（縦書き）
  ctx.textAlign = 'center';
  const chars = [...(f.kind || '')];
  if (chars.length) {
    const kFont = Math.min((bodyH * 0.86) / chars.length, labelW * 0.66);
    ctx.font = `bold ${kFont}px sans-serif`;
    const totalH = kFont * chars.length;
    const startY = y + rowH * 2 + (bodyH - totalH) / 2 + kFont / 2;
    chars.forEach((c, i) => ctx.fillText(c, x + labelW / 2, startY + i * kFont));
  }

  // 通し番号（丸囲み）
  const cx = x + labelW + (w - labelW) / 2;
  const cy = y + rowH * 2 + bodyH / 2;
  const r = Math.min(w - labelW, bodyH) * 0.34;
  ctx.lineWidth = Math.max(2, w * 0.01);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = `bold ${r * 1.15}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(String(f.no), cx, cy + r * 0.04);

  ctx.restore();
}

// 幅maxWに収まるようフォントを縮めて描画
function drawFit(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  baseFont: number,
): void {
  let fs = baseFont;
  ctx.font = `bold ${fs}px sans-serif`;
  while (fs > 8 && ctx.measureText(text).width > maxW) {
    fs -= 1;
    ctx.font = `bold ${fs}px sans-serif`;
  }
  ctx.fillText(text, x, y);
}
