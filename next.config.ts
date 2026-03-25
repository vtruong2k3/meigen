import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.meigen.ai",
        pathname: "/tweets/**",
      },
      {
        protocol: "https",
        hostname: "s3-nl.hostkey.com",
      },
      {
        protocol: "https",
        hostname: "ark-common-storage-prod-ap-southeast-1.tos-ap-southeast-1.volces.com",
      },
      {
        protocol: "https",
        hostname: "ark-content-generation-v2-cn-beijing.tos-cn-beijing.volces.com",
      },
      {
        protocol: "https",
        hostname: "midjourney-plus.oss-us-west-1.aliyuncs.com",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
