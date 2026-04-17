import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export',
  basePath: '/admin',
  images: { unoptimized: true },
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
};

export default nextConfig;
