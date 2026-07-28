// 撮影/添付した写真を 5:4 の横長に中央基準で切り出し＋縮小＋圧縮する（canvasのみ）

const RATIO = 5 / 4; // 横:縦

export async function toFiveFour(file: File, maxW = 1280, quality = 0.72): Promise<string> {
  const src = await loadImageFromFile(file);
  const sw = src.naturalWidth || src.width;
  const sh = src.naturalHeight || src.height;
  if (!sw || !sh) throw new Error('invalid image');

  const srcRatio = sw / sh;
  let cropW: number;
  let cropH: number;
  let cx: number;
  let cy: number;
  if (srcRatio > RATIO) {
    // 横に広い → 幅を切る
    cropH = sh;
    cropW = sh * RATIO;
    cx = (sw - cropW) / 2;
    cy = 0;
  } else {
    // 縦に長い → 高さを切る
    cropW = sw;
    cropH = sw / RATIO;
    cx = 0;
    cy = (sh - cropH) / 2;
  }

  const outW = Math.min(maxW, Math.round(cropW));
  const outH = Math.round(outW / RATIO);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  ctx.drawImage(src, cx, cy, cropW, cropH, 0, 0, outW, outH);
  return canvas.toDataURL('image/jpeg', quality);
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
