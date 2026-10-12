// Veri katmanı: Neon (Postgres) üzerinden okur, sonuçlar Next.js önbelleğinde tutulur.
// Yönetim paneli veri değiştirdiğinde updateTag("series") ile önbellek yenilenir.
//
// Her sayfa yalnızca ihtiyacı kadarını çeker: liste sayfaları seri bilgisi ve son 3 bölümü,
// seri sayfası o serinin bölüm listesini, bölüm sayfası da yalnızca o bölümün sayfalarını.
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { chapters as chaptersTable, series as seriesTable, seriesViewsDaily } from "@/db/schema";
import { slugify } from "@/lib/slug";
import type { Chapter, ChapterInfo, Page, Period, PeriodViews, Series, SeriesSummary } from "@/lib/series";

export * from "@/lib/series";

const seriesColumns = {
  slug: seriesTable.slug,
  title: seriesTable.title,
  titleEn: seriesTable.titleEn,
  description: seriesTable.description,
  genres: seriesTable.genres,
  status: seriesTable.status,
  cover: seriesTable.cover,
  views: seriesTable.views,
};

// Sitede İngilizce ad başlıktır; Türkçe ad yalnızca seri sayfasında altında görünür (titleAlt).
// İngilizce adı olmayan eski serilerde Türkçe ad başlık olur.
function withNames<T extends { title: string; titleEn: string }>({ title, titleEn, ...rest }: T) {
  const en = titleEn.trim();
  return { ...rest, title: en || title, titleAlt: en ? title : "" };
}
const displayTitle = sql`coalesce(nullif(trim(${seriesTable.titleEn}), ''), ${seriesTable.title})`;

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
    db.select({ id: seriesTable.id, ...seriesColumns, addedAt: seriesTable.createdAt }).from(seriesTable).orderBy(asc(displayTitle)),
    db.select().from(ranked).where(lte(ranked.rank, 3)).orderBy(asc(ranked.seriesId), asc(ranked.rank)),
  ]);

  const bySeries = new Map<number, typeof latest>();
  for (const c of latest) {
    if (!bySeries.has(c.seriesId)) bySeries.set(c.seriesId, []);
    bySeries.get(c.seriesId)!.push(c);
  }

  return rows.map(({ id, addedAt, ...s }) => {
    const cs = bySeries.get(id) ?? [];
    return {
      ...withNames(s),
      addedAt: iso(addedAt),
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
    ...withNames(row),
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

const PERIOD_DAYS = { gunluk: 1, haftalik: 7, aylik: 30 } as const;

export type PopularEntry = {
  series: SeriesSummary;
  views: number; // seçilen dönemdeki okunma
};

/** İstanbul saatine göre bugünden `offset` gün önceki tarih, "YYYY-MM-DD". */
function istanbulDay(offset: number) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

/** Her serinin bugünkü, son 7 ve son 30 gündeki okunması ve toplam okunması; slug'a göre. */
export async function getPeriodViews(): Promise<Record<string, PeriodViews>> {
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

  const result: Record<string, PeriodViews> = {};
  for (const s of all) result[s.slug] = { gunluk: 0, haftalik: 0, aylik: 0, tum: s.views };
  // Günler bugünden geriye: bugün tüm dönemlere, 7 günden eskisi yalnızca aylığa girer
  const since = Object.fromEntries(
    Object.entries(PERIOD_DAYS).map(([p, days]) => [p, istanbulDay(days - 1)]),
  ) as Record<keyof typeof PERIOD_DAYS, string>;
  for (const r of rows) {
    const v = result[r.slug];
    if (!v) continue;
    for (const p of Object.keys(PERIOD_DAYS) as (keyof typeof PERIOD_DAYS)[]) {
      if (r.day >= since[p]) v[p] += r.views;
    }
  }
  return result;
}

/** Günlük, haftalık, aylık ve tüm zamanların en çok okunan serileri. */
export async function getPopular(limit = 5): Promise<Record<Period, PopularEntry[]>> {
  const [all, views] = await Promise.all([getSeriesList(), getPeriodViews()]);
  const result = {} as Record<Period, PopularEntry[]>;
  for (const period of ["gunluk", "haftalik", "aylik", "tum"] as const) {
    result[period] = all
      .map((s) => ({ series: s, views: views[s.slug]?.[period] ?? 0 }))
      .filter((e) => e.views > 0)
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }
  return result;
}

export async function getAllGenres(): Promise<string[]> {
  return (await getGenres()).map((g) => g.name);
}

export type GenreSummary = { name: string; slug: string; count: number };

/**
 * Serilerde geçen türler, adlarına göre sıralı; her biri sayfa adresi ve seri sayısıyla.
 * Aynı adrese düşen yazımlar ("korku", "Korku") tek tür sayılır; en çok kullanılan yazım gösterilir.
 */
export async function getGenres(): Promise<GenreSummary[]> {
  const bySlug = new Map<string, { names: Map<string, number>; series: Set<string> }>();
  for (const s of await getSeriesList()) {
    for (const name of s.genres) {
      const slug = slugify(name);
      if (!slug) continue;
      const g = bySlug.get(slug) ?? { names: new Map(), series: new Set() };
      g.names.set(name, (g.names.get(name) ?? 0) + 1);
      g.series.add(s.slug);
      bySlug.set(slug, g);
    }
  }
  return [...bySlug]
    .map(([slug, g]) => ({
      name: [...g.names].sort((a, b) => b[1] - a[1])[0][0],
      slug,
      count: g.series.size,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}
