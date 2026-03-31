import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ap.rdcpix.com" },
      { protocol: "https", hostname: "*.rdcpix.com" },
      { protocol: "https", hostname: "ssl.cdn-redfin.com" },
      { protocol: "https", hostname: "*.redfin.com" },
    ],
  },
};

export default nextConfig;
