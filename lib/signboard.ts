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
  const cxPole = x + w * 0.32;
  const poleW = w * 0.05;
  const poleH = w * STAND_RATIO;
  const top = boardBottom - w * 0.008;
  ctx.save();
  // 影
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = w * 0.02;
  ctx.shadowOffsetY = w * 0.012;

  // 棒（金属っぽいグラデーション）
  const pg = ctx.createLinearGradient(cxPole - poleW / 2, 0, cxPole + poleW / 2, 0);
  pg.addColorStop(0, '#3b4149');
  pg.addColorStop(0.45, '#aeb6c0');
  pg.addColorStop(0.55, '#c9d0d8');
  pg.addColorStop(1, '#3b4149');
  ctx.fillStyle = pg;
  roundRect(ctx, cxPole - poleW / 2, top, poleW, poleH, poleW * 0.45);
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // 看板を挟むクランプ（ホルダー）
  ctx.fillStyle = '#23272e';
  const clampW = w * 0.15;
  const clampH = w * 0.05;
  roundRect(ctx, cxPole - clampW / 2, top - clampH * 0.55, clampW, clampH, clampH * 0.35);
  ctx.fill();
  // クランプの爪（左右）
  const armH = clampH * 1.5;
  const armW = clampW * 0.14;
  roundRect(ctx, cxPole - clampW / 2, top - armH, armW, armH, armW * 0.4);
  ctx.fill();
  roundRect(ctx, cxPole + clampW / 2 - armW, top - armH, armW, armH, armW * 0.4);
  ctx.fill();
  // 中央のネジ
  ctx.fillStyle = '#5b6470';
  ctx.beginPath();
  ctx.arc(cxPole, top - clampH * 0.05, clampH * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // 先端のグリップ（発泡ハンドル）
  const gripW = poleW * 2.1;
  const gripH = poleH * 0.34;
  const gg = ctx.createLinearGradient(cxPole - gripW / 2, 0, cxPole + gripW / 2, 0);
  gg.addColorStop(0, '#141414');
  gg.addColorStop(0.5, '#3a3a3a');
  gg.addColorStop(1, '#141414');
  ctx.fillStyle = gg;
  roundRect(ctx, cxPole - gripW / 2, top + poleH - gripH, gripW, gripH, gripW * 0.45);
  ctx.fill();
  ctx.restore();
}

// 看板の色（白 / 緑）
export type SignColor = 'white' | 'green';

interface Palette {
  panelTop: string;
  panelBottom: string;
  ink: string; // 文字・番号・丸
  frame: string; // 外枠
  inner: string; // 内枠
  grid: string; // 罫線
  rivet: string; // 四隅のビス
}

const PALETTES: Record<SignColor, Palette> = {
  white: {
    panelTop: '#ffffff',
    panelBottom: '#e9ecef',
    ink: '#111111',
    frame: '#141414',
    inner: 'rgba(0,0,0,0.28)',
    grid: '#1a1a1a',
    rivet: 'rgba(90,100,112,0.9)',
  },
  green: {
    panelTop: '#2f8f43',
    panelBottom: '#1f6d31',
    ink: '#ffffff',
    frame: '#0e3d1c',
    inner: 'rgba(255,255,255,0.4)',
    grid: '#ffffff',
    rivet: 'rgba(255,255,255,0.85)',
  },
};

// 指定位置(x,y)に幅wの看板を描く（withStand=trueで下に自撮り棒を付ける）
export function drawSignboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  f: SignFields,
  withStand = false,
  color: SignColor = 'white',
): void {
  const pal = PALETTES[color] ?? PALETTES.white;
  if (withStand) drawStand(ctx, x, y + signboardHeight(w), w);
  const rowH = w * 0.15; // 工事名/場所の行の高さ
  const bodyH = w * 0.4; // 種別＋番号エリアの高さ
  const h = rowH * 2 + bodyH; // = w * 0.70
  const labelW = w * 0.3; // 左のラベル列の幅

  const rad = w * 0.022;

  ctx.save();

  // 影付きの白パネル（わずかにグラデーションでプラスチック板っぽく）
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.38)';
  ctx.shadowBlur = w * 0.035;
  ctx.shadowOffsetX = w * 0.012;
  ctx.shadowOffsetY = w * 0.022;
  const panel = ctx.createLinearGradient(x, y, x, y + h);
  panel.addColorStop(0, pal.panelTop);
  panel.addColorStop(1, pal.panelBottom);
  ctx.fillStyle = panel;
  roundRect(ctx, x, y, w, h, rad);
  ctx.fill();
  ctx.restore();

  // 外枠（太）＋内枠（細）
  ctx.lineJoin = 'round';
  ctx.strokeStyle = pal.frame;
  ctx.lineWidth = Math.max(2, w * 0.013);
  roundRect(ctx, x, y, w, h, rad);
  ctx.stroke();
  const inset = w * 0.02;
  ctx.strokeStyle = pal.inner;
  ctx.lineWidth = Math.max(1, w * 0.004);
  roundRect(ctx, x + inset, y + inset, w - inset * 2, h - inset * 2, Math.max(1, rad - inset));
  ctx.stroke();

  // 罫線（角の丸みからはみ出ないよう少し内側で描く）
  const gi = Math.max(2, w * 0.013);
  ctx.strokeStyle = pal.grid;
  ctx.lineWidth = Math.max(1, w * 0.007);
  ctx.beginPath();
  ctx.moveTo(x + gi, y + rowH);
  ctx.lineTo(x + w - gi, y + rowH); // 工事名/場所の間
  ctx.moveTo(x + gi, y + rowH * 2);
  ctx.lineTo(x + w - gi, y + rowH * 2); // ヘッダー/本体の間
  ctx.moveTo(x + labelW, y + gi);
  ctx.lineTo(x + labelW, y + h - gi); // ラベル列の縦線
  ctx.stroke();

  // 四隅のリベット（ビス）
  ctx.fillStyle = pal.rivet;
  const rv = w * 0.012;
  const ro = w * 0.045;
  for (const [rx, ry] of [
    [x + ro, y + ro],
    [x + w - ro, y + ro],
    [x + ro, y + h - ro],
    [x + w - ro, y + h - ro],
  ]) {
    ctx.beginPath();
    ctx.arc(rx, ry, rv, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = pal.ink;
  ctx.strokeStyle = pal.ink;
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
