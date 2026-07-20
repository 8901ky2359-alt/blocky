/** @type {import('next').NextConfig} */
const nextConfig = {
  // 完全なクライアント動作アプリ。静的書き出しして Cloudflare Pages 等で配信する。
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
