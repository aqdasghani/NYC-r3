import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  env: {
    ...(process.env.NEXT_PUBLIC_API_URL ? { NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL } : {}),
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
