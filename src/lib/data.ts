// Veri katmanı: Neon (Postgres) üzerinden okur, sonuçlar Next.js önbelleğinde tutulur.
// Yönetim paneli veri değiştirdiğinde revalidateTag("series") ile önbellek yenilenecek.
import { asc, eq, gte } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { chapters as chaptersTable, series as seriesTable, seriesViewsDaily } from "@/db/schema";
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
    views: s.views,
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

export type Period = "gunluk" | "haftalik" | "aylik";
const PERIOD_DAYS: Record<Period, number> = { gunluk: 1, haftalik: 7, aylik: 30 };
export const TREND_DAYS = 14;

export type PopularEntry = {
  series: Series;
  views: number; // seçilen dönemdeki okunma
  trend: { day: string; views: number }[]; // son 14 gün, eskiden yeniye
};

/** İstanbul saatine göre bugünden `offset` gün önceki tarih, "YYYY-MM-DD". */
function istanbulDay(offset: number) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

/** Günlük, haftalık ve aylık en çok okunan seriler (son 14 günlük eğriyle). */
export async function getPopular(limit = 5): Promise<Record<Period, PopularEntry[]>> {
  "use cache";
  cacheTag("series", "views");
  cacheLife("minutes");

  const [all, rows] = await Promise.all([
    getAllSeries(),
    db
      .select({ slug: seriesTable.slug, day: seriesViewsDaily.day, views: seriesViewsDaily.views })
      .from(seriesViewsDaily)
      .innerJoin(seriesTable, eq(seriesTable.id, seriesViewsDaily.seriesId))
      .where(gte(seriesViewsDaily.day, istanbulDay(29))),
  ]);

  // slug -> (gün -> okunma)
  const counts = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!counts.has(r.slug)) counts.set(r.slug, new Map());
    counts.get(r.slug)!.set(r.day, r.views);
  }
  const trendDays = Array.from({ length: TREND_DAYS }, (_, i) => istanbulDay(TREND_DAYS - 1 - i));

  const result = {} as Record<Period, PopularEntry[]>;
  for (const period of Object.keys(PERIOD_DAYS) as Period[]) {
    const days = Array.from({ length: PERIOD_DAYS[period] }, (_, i) => istanbulDay(i));
    result[period] = all
      .map((s) => {
        const c = counts.get(s.slug) ?? new Map<string, number>();
        return {
          series: s,
          views: days.reduce((sum, d) => sum + (c.get(d) ?? 0), 0),
          trend: trendDays.map((day) => ({ day, views: c.get(day) ?? 0 })),
        };
      })
      .filter((e) => e.views > 0)
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }
  return result;
}

export async function getAllGenres(): Promise<string[]> {
  const all = await getAllSeries();
  return [...new Set(all.flatMap((s) => s.genres))].sort((a, b) => a.localeCompare(b, "tr"));
}
