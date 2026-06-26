/** @type {import('next').NextConfig} */

// GitHub Pages はサブパス（/blocky/）配信のため basePath が必要。
// PAGES=true のときだけ付与し、Netlify・ローカルはルート配信のまま動かす。
const isPages = process.env.PAGES === 'true';
const repo = '/blocky';

const nextConfig = {
  // どこでも開ける静的HTMLとして書き出す（out/ に生成される）
  output: 'export',
  images: { unoptimized: true },
  ...(isPages ? { basePath: repo, assetPrefix: `${repo}/` } : {}),
};

export default nextConfig;
