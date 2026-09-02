import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/auth/google/:path*",
        destination: "http://localhost:5000/api/auth/google/:path*",
      },
    ];
  },
};

export default nextConfig;
