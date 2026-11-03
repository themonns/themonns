import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Statiske nettsteder i public/ bruker relative stier, så mappeadresser må ende med skråstrek. */
  trailingSlash: true,
  outputFileTracingIncludes: {
    "/intern/hyttebooking": ["./sider/intern-hyttebooking.html"],
    "/thon/osloairport": ["./sider/thon-osloairport.html"],
    "/vikaeiendomsforvaltning": ["./public/vikaeiendomsforvaltning/_index.html"],
    "/vikaeiendomsforvaltning/kirkegata": ["./public/vikaeiendomsforvaltning/kirkegata/_index.html"],
    "/eiendomsspar/tryvannstarnet": ["./public/eiendomsspar/tryvannstarnet/_index.html"],
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    },
  ],
};

export default nextConfig;
