/** @type {import('next').NextConfig} */
const nextConfig = {
  // どこでも開ける静的HTMLとして書き出す（out/ に生成される）
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
