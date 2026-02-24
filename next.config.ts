import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow serving uploaded files from /public/uploads
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
    ],
  },
  // Increase body size limit for file uploads (10 MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
