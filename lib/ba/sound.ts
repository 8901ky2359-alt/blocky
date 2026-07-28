'use client';

// シャッター音（Web Audioで合成。外部ファイル不要）

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

const KEY = 'ba-shutter-sound';

export function soundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(KEY) !== 'off';
}

export function setSoundEnabled(on: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, on ? 'on' : 'off');
}

// カメラのシャッター音（カチッ・カチッ）。ユーザー操作内で呼ぶこと。
export function playShutter(): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  click(c, now, 0.9);
  click(c, now + 0.075, 0.55);
}

function click(c: AudioContext, t: number, peak: number): void {
  const dur = 0.05;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1; // ホワイトノイズ
  const src = c.createBufferSource();
  src.buffer = buffer;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2600;
  bp.Q.value = 0.9;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp);
  bp.connect(g);
  g.connect(c.destination);
  src.start(t);
  src.stop(t + dur);
}
