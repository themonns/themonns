import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/intern/hyttebooking": ["./sider/intern-hyttebooking.html"],
    "/thon/osloairport": ["./sider/thon-osloairport.html"],
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    },
  ],
};

export default nextConfig;
