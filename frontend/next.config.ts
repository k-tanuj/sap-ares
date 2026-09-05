import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://ares-backend.cfapps.us10-001.hana.ondemand.com" : "http://127.0.0.1:8000");

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: backendUrl,
  },

  // Proxy /api/* calls to the backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
