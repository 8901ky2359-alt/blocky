# 📝 作業日報（独立サイト）

「現場家計簿（本体サイト）」とは別に、単独のCloudflare Workerとしてデプロイする
作業日報アプリです。作業員がメールアドレス・パスワードでログインし、カレンダーから
作業日・現場名・作業内容・金額を入力→管理者が確認・修正・承認するアプリです。

本体サイト（`../`）とは完全に別プロジェクト・別デプロイです。本体サイトのビルド・
デプロイには一切影響しません。データベース（D1）だけ本体と共有していますが、
使うテーブル（`ts_users` / `ts_entries`）は別なので、既存の売上管理データ等とは
混ざりません。

## はじめてのデプロイ手順

```bash
cd timesheet-app
npm install

# ログイン情報を署名するための秘密鍵を設定（初回のみ・必須ではないが強く推奨）
npx wrangler secret put TIMESHEET_SESSION_SECRET
# 例: openssl rand -hex 32 で生成した文字列を貼り付け

npm run build          # 静的書き出し → out/ フォルダに生成
npx wrangler deploy    # Cloudflareにデプロイ
```

デプロイが完了すると、`https://blocky-timesheet.<あなたのサブドメイン>.workers.dev`
のようなURLが表示されます。このURLを本体サイトの「作業日報」ボタンに設定してください
（本体の `components/Launcher.tsx` と `components/AppMenu.tsx` にある
`TIMESHEET_URL` という変数を、このURLに書き換えてから本体サイトを再デプロイします）。

## はじめての利用手順（デプロイ後）

1. 発行されたURLをスマホ・PCで開く
2. 最初のアクセス時だけ「管理者アカウントの作成」画面が出るので、山田さんの
   メールアドレス・パスワード・名前を入力
3. 管理画面の「作業員管理」タブから、各作業員のアカウント（メール・初期パスワード・
   名前）を登録して伝える
4. スマホでは「ホーム画面に追加」でアプリのように起動できます

## 開発（ローカル確認）

```bash
npm install
npm run dev             # http://localhost:3000 （UIのみ。API確認は wrangler dev を使用）
```

Worker（API）をローカルで試すには:

```bash
npm run build
npx wrangler dev --local
```

技術構成: Next.js 14 (App Router / static export) / TypeScript / Tailwind CSS /
Cloudflare Workers + D1 / パスワードはPBKDF2でハッシュ化 / ログインは署名付き
トークン（HMAC-SHA256, 有効期限30日）
