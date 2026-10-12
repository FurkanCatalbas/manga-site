"use server";

import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/db";
import { profiles, series } from "@/db/schema";
import { getSessionUser } from "@/lib/hesap";
import { PROFILE_TAG } from "@/lib/profil";
import { cleanText, currentMember, LOGIN, type Result } from "@/lib/uye";

const BIO_MAX = 300;

/** Profil ayarları için kendi biyografi ve en sevdiği seri. Tablo yoksa null. */
export async function myProfileSettings(): Promise<{ bio: string; favoriteSlug: string } | null> {
  const me = await getSessionUser();
  if (!me) return null;
  try {
    const [row] = await db
      .select({ bio: profiles.bio, slug: series.slug })
      .from(profiles)
      .leftJoin(series, eq(series.id, profiles.favoriteSeriesId))
      .where(eq(profiles.userId, me.id))
      .limit(1);
    return { bio: row?.bio ?? "", favoriteSlug: row?.slug ?? "" };
  } catch {
    return null;
  }
}

export async function updateProfile(input: { bio: string; favoriteSlug: string }): Promise<Result> {
  const me = await currentMember();
  if (!me.user) return { ok: false, error: me.error ?? LOGIN };
  const bio = cleanText(input.bio).replace(/\n{2,}/g, "\n");
  if (bio.length > BIO_MAX) return { ok: false, error: `Tanıtım en fazla ${BIO_MAX} karakter olabilir.` };
  let favoriteSeriesId: number | null = null;
  if (input.favoriteSlug) {
    const [s] = await db.select({ id: series.id }).from(series).where(eq(series.slug, String(input.favoriteSlug))).limit(1);
    if (!s) return { ok: false, error: "Seri bulunamadı." };
    favoriteSeriesId = s.id;
  }
  await db
    .insert(profiles)
    .values({ userId: me.user.id, bio, favoriteSeriesId })
    .onConflictDoUpdate({ target: profiles.userId, set: { bio, favoriteSeriesId, updatedAt: new Date() } });
  updateTag(PROFILE_TAG);
  return { ok: true };
}
