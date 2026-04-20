import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow pdf-parse to work in server-side API routes
  serverExternalPackages: ["pdf-parse"],
  
  // Experimental features
  experimental: {
    // Allow large API responses for PDF processing
  },
};

export default nextConfig;
