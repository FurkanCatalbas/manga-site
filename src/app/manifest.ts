import type { MetadataRoute } from "next";
import { BRAND_COLORS } from "@/lib/brand";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

// Uygulama manifesti: telefonda "Ana ekrana ekle" ile site uygulama gibi açılır (PWA'nın ilk adımı).
// İkonlar `npm run icons` ile üretilir.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME}: Webtoon ve Manga Oku`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: "tr",
    start_url: "/",
    display: "standalone",
    background_color: BRAND_COLORS.bg,
    theme_color: BRAND_COLORS.bg,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
