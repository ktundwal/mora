import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove "export" for dev - we need server features for auth
  // output: "export",
  transpilePackages: ["@mora/core"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
