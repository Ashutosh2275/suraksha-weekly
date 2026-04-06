/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@suraksha/shared-types'],
  typescript: {
    // Temporarily ignore type errors during build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Also ignore eslint errors during build
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}

module.exports = nextConfig
