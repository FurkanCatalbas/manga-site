// Veri katmanı: Neon (Postgres) üzerinden okur, sonuçlar Next.js önbelleğinde tutulur.
// Yönetim paneli veri değiştirdiğinde revalidateTag("series") ile önbellek yenilenecek.
import { asc } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { chapters as chaptersTable, series as seriesTable } from "@/db/schema";
import { latestChapter, type Series } from "@/lib/series";

export * from "@/lib/series";

export async function getAllSeries(): Promise<Series[]> {
  "use cache";
  cacheTag("series");
  cacheLife("hours");

  const rows = await db.query.series.findMany({
    orderBy: asc(seriesTable.title),
    with: { chapters: { orderBy: asc(chaptersTable.number) } },
  });
  return rows.map(({ chapters, ...s }) => ({
    slug: s.slug,
    title: s.title,
    author: s.author,
    description: s.description,
    genres: s.genres,
    status: s.status,
    cover: s.cover,
    chapters: chapters.map((c) => ({
      number: c.number,
      title: c.title,
      publishedAt: c.publishedAt.toISOString(),
      pages: c.pages,
    })),
  }));
}

export async function getSeries(slug: string): Promise<Series | undefined> {
  return (await getAllSeries()).find((s) => s.slug === slug);
}

export async function getChapter(slug: string, number: number) {
  const series = await getSeries(slug);
  const chapter = series?.chapters.find((c) => c.number === number);
  if (!series || !chapter) return undefined;
  return { series, chapter };
}

/** Son güncellenen seriler, en yeni bölüme göre sıralı. */
export async function getRecentlyUpdated(): Promise<Series[]> {
  return [...(await getAllSeries())].sort((a, b) =>
    (latestChapter(b)?.publishedAt ?? "").localeCompare(latestChapter(a)?.publishedAt ?? ""),
  );
}

export async function getAllGenres(): Promise<string[]> {
  const all = await getAllSeries();
  return [...new Set(all.flatMap((s) => s.genres))].sort((a, b) => a.localeCompare(b, "tr"));
}
