import type { MetadataRoute } from "next";
import { getAllSeries, latestChapter } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

// Ana sayfa, seri sayfaları ve tüm bölüm sayfaları. Yeni bölüm eklenince kendiliğinden güncellenir.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const all = await getAllSeries();
  const lastUpdate = all
    .map((s) => latestChapter(s)?.publishedAt)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);

  return [
    { url: SITE_URL, lastModified: lastUpdate, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/ara`, changeFrequency: "daily", priority: 0.6 },
    ...all.flatMap((s) => [
      {
        url: `${SITE_URL}/seri/${s.slug}`,
        lastModified: latestChapter(s)?.publishedAt,
        changeFrequency: "weekly" as const,
        priority: 0.9,
      },
      ...s.chapters.map((c) => ({
        url: `${SITE_URL}/seri/${s.slug}/bolum/${c.number}`,
        lastModified: c.publishedAt,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ]),
  ];
}
