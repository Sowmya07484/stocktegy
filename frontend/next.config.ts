import type { NextConfig } from "next";

// The browser calls /api/* on this origin; Next.js forwards it to FastAPI at NEXT_PUBLIC_API_BASE_URL.
// Same-origin requests mean the backend needs no CORS setup.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_BASE_URL}/api/:path*` }];
  },
};

export default nextConfig;
