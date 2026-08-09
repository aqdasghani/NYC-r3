import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`, // Proxy to Backend
      },
      {
        source: "/ws/:path*",
        destination: `${backendUrl}/ws/:path*`, // Next.js proxies WS upgrades over HTTP natively
      }
    ];
  },
};

export default nextConfig;
