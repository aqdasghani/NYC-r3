import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disabled to prevent FedCM/Google OAuth AbortError caused by React Strict Mode
  // double-mounting in development. Re-enable after Google's library supports Strict Mode.
  reactStrictMode: false,
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
