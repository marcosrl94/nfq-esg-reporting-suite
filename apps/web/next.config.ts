import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  // Transpile workspace packages
  transpilePackages: ["@geshop/ui", "@geshop/db"],
};

export default nextConfig;
