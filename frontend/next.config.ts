import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://ares-backend.cfapps.us10-001.hana.ondemand.com";

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
