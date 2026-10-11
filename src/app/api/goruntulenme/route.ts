// Okuyucu bir bölümü açtığında seri görüntülenme sayacını bir artırır.
// Tarayıcı aynı bölümü günde bir kez sayar (bkz. ViewBeacon).
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { series } from "@/db/schema";
import { SLUG_PATTERN } from "@/lib/slug";

export async function POST(request: Request) {
  const { slug } = await request.json().catch(() => ({}));
  if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
    return new Response(null, { status: 400 });
  }
  await db.update(series).set({ views: sql`${series.views} + 1` }).where(eq(series.slug, slug));
  return new Response(null, { status: 204 });
}
