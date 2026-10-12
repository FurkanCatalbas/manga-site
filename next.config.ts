import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Paylaşım görselleri istek anında çizilir; yazı tipleri sunucu paketine dahil edilmeli
  outputFileTracingIncludes: { "/paylasim/**": ["./assets/fonts/*.woff"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
