import data from './checklist.json';

export type ChipKind = 'crack' | 'scour' | 'sand' | 'light';
export type BadgeKind = 'high' | 'mid' | 'low' | 'none';
export type Priority = '高' | '中' | '低' | '-';

export type Chip = { kind: ChipKind; label: string };

export type Photo = {
  id: string;
  alt: string;
  caption: string;
  src: string;
};

export type ChecklistItem = {
  no: string;
  priority: Priority;
  badgeKind: BadgeKind;
  badgeLabel: string;
  gid: string | null;
  title: string;
  other: string | null;
  chips: Chip[];
  note: string | null;
  action: string | null;
  photos: Photo[];
};

export const checklist = data as ChecklistItem[];

/** ヘッダーの集計値（優先度別の件数） */
export const summary = {
  high: checklist.filter((i) => i.priority === '高').length,
  mid: checklist.filter((i) => i.priority === '中').length,
  low: checklist.filter((i) => i.priority === '低').length,
  watch: checklist.filter((i) => i.priority === '-').length,
  total: checklist.length,
};
