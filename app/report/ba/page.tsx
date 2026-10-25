'use client';

// ツールボックスの中のビフォーアフター（/ba と同じもの。写真は端末内で共通）
import BAApp from '@/components/ba/BAApp';

export default function ToolboxBAPage() {
  return <BAApp back={{ href: '/report', label: 'ツールボックス' }} />;
}
