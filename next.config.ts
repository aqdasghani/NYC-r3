import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000',
  },
  // Allow build to succeed even with some TS issues from WIP features
  typescript: {
    // Only enable this temporarily during multi-agent development
    // ignoreBuildErrors: true,
  },
};

export default nextConfig;
