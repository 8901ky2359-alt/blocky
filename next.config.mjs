/** @type {import('next').NextConfig} */
const nextConfig = {
  // 完全に静的なサイトなので静的HTMLとして書き出す（out/ に生成）。
  // Cloudflare Pages などの静的ホスティングにそのままデプロイできる。
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
