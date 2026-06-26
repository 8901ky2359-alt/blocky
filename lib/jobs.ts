// サイト全体の設定。ここを書き換えるだけで見出しやLINEの飛び先を変更できます。
export const siteConfig = {
  title: '山田お仕事案内',
  tagline: '草刈り現場・オンライン副業の最新募集をまとめてお届けします。',
  // 公式LINEのURL。LINE公式アカウント Managerで発行したURLに差し替えてください。
  lineUrl: 'https://lin.ee/your-line-id',
  // 「相談」ボタンの文言
  lineButtonLabel: 'LINEで相談・応募する',
  // 運営者名（最初のご挨拶を担当）
  ownerName: '山田',
  // 「ご利用の流れ」3ステップ
  flow: [
    { step: '1', title: '気になる案件を選ぶ', desc: '草刈り・副業から、ご自身に合うものを探します。' },
    { step: '2', title: 'LINEで相談', desc: '「相談」ボタンから気軽にメッセージ。応募も質問もOK。' },
    { step: '3', title: '山田がご案内', desc: 'はじめのご挨拶は山田が対応。その後スタッフがサポートします。' },
  ],
  // フッターの注意書き
  notice: '掲載内容は予告なく変更・終了する場合があります。最新情報はLINEでご確認ください。',
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
    location: '茨城県つくば市周辺',
    pay: '日給 10,000円〜（経験により応相談）',
    description:
      '中規模の太陽光発電所の草刈り現場です。未経験OK・道具の使い方は丁寧にお教えします。副業・単発でも歓迎。送迎相談可。',
    tags: ['未経験OK', '副業OK', '単発OK', '送迎相談可'],
  },
  {
    id: 'kusakari-spot-2026-07-12',
    title: '【週末だけ】河川敷の草刈りサポート（2名）',
    category: '草刈り',
    status: '募集中',
    updatedAt: '2026-07-12',
    location: '茨城県土浦市',
    pay: '日給 9,000円（昼食付き）',
    description:
      '土日のみの短期案件です。学生・Wワークの方も多数活躍中。体を動かして稼ぎたい方にぴったりです。',
    tags: ['土日のみ', '短期', '昼食付き'],
  },
  {
    id: 'online-data-2026-07-05',
    title: 'オンライン完結のデータ入力（在宅）',
    category: '副業',
    status: '募集中',
    updatedAt: '2026-07-05',
    location: '在宅・フルリモート',
    pay: '案件単位 / 月 20,000円〜',
    description:
      'スキマ時間でできる在宅ワークです。パソコンとネット環境があればOK。キャリア相談にも対応しています。',
    tags: ['在宅', 'スキマ時間', '初心者歓迎', 'PC作業'],
  },
  {
    id: 'career-advice-2026-07-05',
    title: 'オンラインキャリア相談（無料）',
    category: '副業',
    status: '募集中',
    updatedAt: '2026-07-05',
    location: 'オンライン（LINE / ビデオ通話）',
    pay: '無料相談',
    description:
      '元キャリアアドバイザーが、転職・副業・働き方の悩みをオンラインでお聞きします。無理な勧誘は一切ありません。',
    tags: ['無料', 'オンライン完結', '相談だけOK'],
  },
  {
    id: 'kusakari-keizoku',
    title: '草刈り定期メンテナンス（継続案件）',
    category: '草刈り',
    status: '継続中',
    updatedAt: '2026-06-20',
    location: '茨城県県南エリア',
    pay: '日給 12,000円〜',
    description:
      '定期的に発生する継続のお仕事です。長く一緒に働ける方を探しています。経験者は優遇します。',
    tags: ['継続', '定期', '経験者優遇'],
  },
];
