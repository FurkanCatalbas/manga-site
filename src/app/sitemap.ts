import type { MetadataRoute } from "next";
import { getChapterRefs, getSeriesList } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

// Ana sayfa, seri sayfaları ve tüm bölüm sayfaları. Yeni bölüm eklenince kendiliğinden güncellenir.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [all, chapters] = await Promise.all([getSeriesList(), getChapterRefs()]);
  const lastUpdate = chapters
    .map((c) => c.publishedAt)
    .sort()
    .at(-1);

  return [
    { url: SITE_URL, lastModified: lastUpdate, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/ara`, changeFrequency: "daily", priority: 0.6 },
    ...all.map((s) => ({
      url: `${SITE_URL}/seri/${s.slug}`,
      lastModified: s.latestChapters[0]?.publishedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...chapters.map((c) => ({
      url: `${SITE_URL}/seri/${c.slug}/bolum/${c.number}`,
      lastModified: c.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
