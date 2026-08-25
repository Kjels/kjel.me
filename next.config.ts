import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /rooms is a static file in public/rooms/index.html; Next's router would 404 the
  // extensionless path without this.
  async rewrites() {
    return [{ source: "/rooms", destination: "/rooms/index.html" }];
  },
};

export default nextConfig;
