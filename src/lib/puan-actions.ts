"use server";

import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/db";
import { series, seriesRatings } from "@/db/schema";
import { getSessionUser } from "@/lib/hesap";
import { RATING_TAG, ratingTag } from "@/lib/puan";
import { scopeTag } from "@/lib/topluluk";
import { currentMember, type Result } from "@/lib/uye";

async function seriesId(slug: string) {
  const [s] = await db.select({ id: series.id }).from(series).where(eq(series.slug, String(slug))).limit(1);
  return s?.id;
}

/** Puan verir (1–10) ya da null ile kaldırır. */
export async function rateSeries(slug: string, score: number | null): Promise<Result> {
  const me = await currentMember();
  if (!me.user) return { ok: false, error: me.error };
  const id = await seriesId(slug);
  if (!id) return { ok: false, error: "Seri bulunamadı." };
  if (score === null) {
    await db.delete(seriesRatings).where(and(eq(seriesRatings.seriesId, id), eq(seriesRatings.userId, me.user.id)));
  } else {
    const s = Number(score);
    if (!Number.isInteger(s) || s < 1 || s > 10) return { ok: false, error: "Geçersiz puan." };
    await db
      .insert(seriesRatings)
      .values({ seriesId: id, userId: me.user.id, score: s })
      .onConflictDoUpdate({ target: [seriesRatings.seriesId, seriesRatings.userId], set: { score: s, updatedAt: new Date() } });
  }
  updateTag(ratingTag(id));
  updateTag(RATING_TAG);
  updateTag(scopeTag(`s${id}`)); // seri yorumlarında yazarın puanı görünür
  return { ok: true };
}

export async function myRating(slug: string): Promise<number | null> {
  const me = await getSessionUser();
  if (!me) return null;
  const id = await seriesId(slug);
  if (!id) return null;
  try {
    const [r] = await db
      .select({ score: seriesRatings.score })
      .from(seriesRatings)
      .where(and(eq(seriesRatings.seriesId, id), eq(seriesRatings.userId, me.id)))
      .limit(1);
    return r?.score ?? null;
  } catch {
    return null;
  }
}
