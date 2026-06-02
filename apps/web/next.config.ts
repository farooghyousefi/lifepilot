import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@lifepilot/api-client",
    "@lifepilot/shared",
    "@lifepilot/ui",
  ],
};

export default nextConfig;

