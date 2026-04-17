/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export',
  basePath: '/admin',
  images: {
    unoptimized: true,
  },
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
};

export default nextConfig;
