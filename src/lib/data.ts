// Veri katmanı: Neon (Postgres) üzerinden okur, sonuçlar Next.js önbelleğinde tutulur.
// Yönetim paneli veri değiştirdiğinde updateTag("series") ile önbellek yenilenir.
//
// Her sayfa yalnızca ihtiyacı kadarını çeker: liste sayfaları seri bilgisi ve son 3 bölümü,
// seri sayfası o serinin bölüm listesini, bölüm sayfası da yalnızca o bölümün sayfalarını.
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { chapters as chaptersTable, series as seriesTable, seriesViewsDaily } from "@/db/schema";
import type { Chapter, ChapterInfo, Page, Series, SeriesSummary } from "@/lib/series";

export * from "@/lib/series";

const seriesColumns = {
  slug: seriesTable.slug,
  title: seriesTable.title,
  author: seriesTable.author,
  description: seriesTable.description,
  genres: seriesTable.genres,
  status: seriesTable.status,
  cover: seriesTable.cover,
  views: seriesTable.views,
};

// Alt sorgudan gelen zaman damgası sürücüye göre Date ya da metin olabilir
const iso = (d: Date | string) => new Date(d).toISOString();

/** Tüm seriler, liste sayfaları için: sayfa adresleri ve eski bölümler olmadan. Ada göre sıralı. */
export async function getSeriesList(): Promise<SeriesSummary[]> {
  "use cache";
  cacheTag("series");
  cacheLife("hours");

  // Her serinin en yeni 3 bölümü, bölüm sayısı ve ilk bölümü tek sorguda
  const ranked = db
    .select({
      seriesId: chaptersTable.seriesId,
      number: chaptersTable.number,
      title: chaptersTable.title,
      publishedAt: chaptersTable.publishedAt,
      rank: sql<number>`row_number() over (partition by ${chaptersTable.seriesId} order by ${chaptersTable.number} desc)`.as("rank"),
      total: sql<number>`(count(*) over (partition by ${chaptersTable.seriesId}))::int`.as("total"),
      first: sql<number>`min(${chaptersTable.number}) over (partition by ${chaptersTable.seriesId})`.as("first"),
    })
    .from(chaptersTable)
    .as("ranked");

  const [rows, latest] = await Promise.all([
    db.select({ id: seriesTable.id, ...seriesColumns }).from(seriesTable).orderBy(asc(seriesTable.title)),
    db.select().from(ranked).where(lte(ranked.rank, 3)).orderBy(asc(ranked.seriesId), asc(ranked.rank)),
  ]);

  const bySeries = new Map<number, typeof latest>();
  for (const c of latest) {
    if (!bySeries.has(c.seriesId)) bySeries.set(c.seriesId, []);
    bySeries.get(c.seriesId)!.push(c);
  }

  return rows.map(({ id, ...s }) => {
    const cs = bySeries.get(id) ?? [];
    return {
      ...s,
      chapterCount: cs[0]?.total ?? 0,
      firstChapter: cs[0]?.first ?? null,
      latestChapters: cs.map((c) => ({ number: c.number, title: c.title, publishedAt: iso(c.publishedAt) })),
    };
  });
}

/** Tek bir seri ve tüm bölümlerinin listesi (sayfalar hariç), eskiden yeniye. */
export async function getSeries(slug: string): Promise<Series | undefined> {
  "use cache";
  cacheTag("series");
  cacheLife("hours");

  const row = await db.query.series.findFirst({
    columns: { id: false, createdAt: false },
    where: eq(seriesTable.slug, slug),
    with: {
      chapters: {
        columns: { number: true, title: true, publishedAt: true },
        orderBy: asc(chaptersTable.number),
      },
    },
  });
  if (!row) return undefined;
  return {
    ...row,
    chapters: row.chapters.map((c) => ({ ...c, publishedAt: iso(c.publishedAt) })),
  };
}

function toPages(row: { pages: string[]; pageSizes: [number, number][] }): Page[] {
  return row.pages.map((src, i) => {
    const size = row.pageSizes[i];
    return size ? { src, width: size[0], height: size[1] } : { src };
  });
}

/** Okuyucu için bir bölüm; sonraki bölümün ilk sayfalarıyla birlikte (önceden yüklemek için). */
export async function getChapter(
  slug: string,
  number: number,
): Promise<{ series: Series; chapter: Chapter; nextPages: Page[] } | undefined> {
  "use cache";
  cacheTag("series");
  cacheLife("hours");

  const series = await getSeries(slug);
  const idx = series?.chapters.findIndex((c) => c.number === number) ?? -1;
  if (!series || idx < 0) return undefined;
  const info = series.chapters[idx];
  const next = series.chapters[idx + 1];

  const rows = await db
    .select({ number: chaptersTable.number, pages: chaptersTable.pages, pageSizes: chaptersTable.pageSizes })
    .from(chaptersTable)
    .innerJoin(seriesTable, eq(seriesTable.id, chaptersTable.seriesId))
    .where(and(eq(seriesTable.slug, slug), inArray(chaptersTable.number, next ? [number, next.number] : [number])));
  const current = rows.find((r) => r.number === number);
  const nextRow = next && rows.find((r) => r.number === next.number);
  if (!current) return undefined;

  return {
    series,
    chapter: { ...info, pages: toPages(current) },
    nextPages: nextRow ? toPages(nextRow).slice(0, 3) : [],
  };
}

/** Tüm bölümlerin adresi ve tarihi: site haritası ve önceden üretilecek sayfalar için. */
export async function getChapterRefs(): Promise<({ slug: string } & Pick<ChapterInfo, "number" | "publishedAt">)[]> {
  "use cache";
  cacheTag("series");
  cacheLife("hours");

  const rows = await db
    .select({ slug: seriesTable.slug, number: chaptersTable.number, publishedAt: chaptersTable.publishedAt })
    .from(chaptersTable)
    .innerJoin(seriesTable, eq(seriesTable.id, chaptersTable.seriesId))
    .orderBy(asc(seriesTable.slug), asc(chaptersTable.number));
  return rows.map((r) => ({ ...r, publishedAt: iso(r.publishedAt) }));
}

/** Son güncellenen seriler, en yeni bölüme göre sıralı. */
export async function getRecentlyUpdated(): Promise<SeriesSummary[]> {
  return [...(await getSeriesList())].sort((a, b) =>
    (b.latestChapters[0]?.publishedAt ?? "").localeCompare(a.latestChapters[0]?.publishedAt ?? ""),
  );
}

export type Period = "gunluk" | "haftalik" | "aylik";
const PERIOD_DAYS: Record<Period, number> = { gunluk: 1, haftalik: 7, aylik: 30 };
export const TREND_DAYS = 14;

export type PopularEntry = {
  series: SeriesSummary;
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
    getSeriesList(),
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
  const all = await getSeriesList();
  return [...new Set(all.flatMap((s) => s.genres))].sort((a, b) => a.localeCompare(b, "tr"));
}
