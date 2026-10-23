'use client';

// カメラ画質設定（解像度・JPEG品質）

export type QualityLevel = 'standard' | 'high';

const KEY = 'ba-quality';

export function getQuality(): QualityLevel {
  if (typeof window === 'undefined') return 'high';
  return (window.localStorage.getItem(KEY) as QualityLevel) === 'standard' ? 'standard' : 'high';
}

export function setQuality(q: QualityLevel): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, q);
}

// 取得解像度・出力サイズ・JPEG品質
export function qualityParams(q: QualityLevel) {
  return q === 'high'
    ? { reqW: 2560, reqH: 1440, maxW: 1920, jpeg: 0.9 }
    : { reqW: 1280, reqH: 960, maxW: 1280, jpeg: 0.78 };
}
