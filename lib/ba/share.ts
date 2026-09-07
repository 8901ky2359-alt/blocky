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
