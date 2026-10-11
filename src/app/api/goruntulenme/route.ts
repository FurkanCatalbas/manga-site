// Okuyucu bir bölümü açtığında serinin toplam ve günlük okunma sayacını bir artırır.
// Tarayıcı aynı bölümü günde bir kez sayar (bkz. Reader içindeki useCountView).
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { series, seriesViewsDaily } from "@/db/schema";
import { SLUG_PATTERN } from "@/lib/slug";

export async function POST(request: Request) {
  const { slug } = await request.json().catch(() => ({}));
  if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
    return new Response(null, { status: 400 });
  }

  const [row] = await db
    .update(series)
    .set({ views: sql`${series.views} + 1` })
    .where(eq(series.slug, slug))
    .returning({ id: series.id });
  if (!row) return new Response(null, { status: 404 });

  await db
    .insert(seriesViewsDaily)
    .values({ seriesId: row.id, day: sql`(now() at time zone 'Europe/Istanbul')::date`, views: 1 })
    .onConflictDoUpdate({
      target: [seriesViewsDaily.seriesId, seriesViewsDaily.day],
      set: { views: sql`${seriesViewsDaily.views} + 1` },
    });

  return new Response(null, { status: 204 });
}
