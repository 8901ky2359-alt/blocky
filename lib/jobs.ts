// サイト全体の設定。ここを書き換えるだけで見出しやLINEの飛び先を変更できます。
export const siteConfig = {
  title: '山田お仕事案内',
  tagline: '草刈り現場・オンライン副業の最新募集をまとめてお届けします。',
  // 公式LINEのURL。LINE公式アカウント Managerで発行したURLに差し替えてください。
  lineUrl: 'https://lin.ee/your-line-id',
  // 「相談」ボタンの文言
  lineButtonLabel: 'LINEで相談・応募する',
};

export type JobCategory = '草刈り' | '副業';
export type JobStatus = '募集中' | '継続中';

export type Job = {
  id: string;
  title: string;
  category: JobCategory;
  status: JobStatus;
  // 更新日。'2026-07-12' の形式で書くと「7月12日更新分」として並びます。
  updatedAt: string;
  location: string;
  pay: string;
  description: string;
  tags: string[];
};

// ここに案件を追加・編集していきます。1件コピーして書き換えるだけで増やせます。
export const jobs: Job[] = [
  {
    id: 'kusakari-2026-07-12',
    title: '草刈り現場スタッフ募集（3名）',
    category: '草刈り',
    status: '募集中',
    updatedAt: '2026-07-12',
    location: '◯◯市周辺',
    pay: '日給 10,000円〜（経験により応相談）',
    description:
      '中規模の草刈り現場です。未経験OK・道具の使い方は丁寧にお教えします。副業・単発でも歓迎。',
    tags: ['未経験OK', '副業OK', '単発OK'],
  },
  {
    id: 'online-2026-07-05',
    title: 'オンライン完結のデータ入力（在宅）',
    category: '副業',
    status: '募集中',
    updatedAt: '2026-07-05',
    location: '在宅・フルリモート',
    pay: '案件単位 / 月 20,000円〜',
    description:
      'スキマ時間でできる在宅ワークです。キャリア相談にも対応しています。まずはお気軽にご相談ください。',
    tags: ['在宅', 'スキマ時間', '初心者歓迎'],
  },
  {
    id: 'kusakari-keizoku',
    title: '草刈り定期メンテナンス（継続案件）',
    category: '草刈り',
    status: '継続中',
    updatedAt: '2026-06-20',
    location: '◯◯エリア',
    pay: '日給 12,000円〜',
    description:
      '定期的に発生する継続のお仕事です。長く一緒に働ける方を探しています。',
    tags: ['継続', '定期'],
  },
];
