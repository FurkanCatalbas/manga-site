// Seri puanları (1–10, arayüzde 5 yıldız): okuma sorguları. Yazma: src/lib/puan-actions.ts.
import { eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { series, seriesRatings } from "@/db/schema";
import { isMissingTable } from "@/lib/genres";

export const RATING_TAG = "puan";
export const ratingTag = (seriesId: number) => `puan-s${seriesId}`;

export type RatingSummary = { avg: number; count: number; dist: number[] }; // dist[0] = 1 puan … dist[9] = 10 puan

/** Serinin ortalaması ve dağılımı. Tablo yoksa null. */
export async function getRatingSummary(seriesId: number): Promise<RatingSummary | null> {
  "use cache";
  cacheTag(ratingTag(seriesId), RATING_TAG);
  try {
    const rows = await db
      .select({ score: seriesRatings.score, n: sql<number>`count(*)::int` })
      .from(seriesRatings)
      .where(eq(seriesRatings.seriesId, seriesId))
      .groupBy(seriesRatings.score);
    const dist = Array.from({ length: 10 }, (_, i) => rows.find((r) => r.score === i + 1)?.n ?? 0);
    const count = dist.reduce((a, b) => a + b, 0);
    const avg = count ? dist.reduce((a, n, i) => a + n * (i + 1), 0) / count : 0;
    cacheLife("days");
    return { avg: Math.round(avg * 10) / 10, count, dist };
  } catch (e) {
    if (!isMissingTable(e)) throw e;
    cacheLife("minutes");
    return null;
  }
}

/** Tüm serilerin ortalaması (Keşfet'te sıralama ve kartlar için), slug'a göre. */
export async function getAllRatings(): Promise<Record<string, { avg: number; count: number }>> {
  "use cache";
  cacheTag(RATING_TAG, "series");
  try {
    const rows = await db
      .select({ slug: series.slug, avg: sql<number>`avg(${seriesRatings.score})::float`, count: sql<number>`count(*)::int` })
      .from(seriesRatings)
      .innerJoin(series, eq(series.id, seriesRatings.seriesId))
      .groupBy(series.slug);
    cacheLife("hours");
    return Object.fromEntries(rows.map((r) => [r.slug, { avg: Math.round(r.avg * 10) / 10, count: r.count }]));
  } catch (e) {
    if (!isMissingTable(e)) throw e;
    cacheLife("minutes");
    return {};
  }
}
