// Herkese açık profil (/u/<kullanıcı adı>) sorgusu (yalnızca sunucuda). Gerçek ad ve e-posta gösterilmez.
import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { chapters, chatMessages, comments, forumPosts, forumTopics, profiles, series, seriesRatings, users } from "@/db/schema";
import { FORUM_TAG, type TopicSummary } from "@/lib/forum";
import { isMissingTable } from "@/lib/genres";
import { getUserLists, LISTS_TAG, type ListSummary } from "@/lib/listeler";
import { RATING_TAG } from "@/lib/puan";

export const PROFILE_TAG = "profil";

const displayTitle = sql<string>`coalesce(nullif(trim(${series.titleEn}), ''), ${series.title})`;
const iso = (d: Date | string) => new Date(d).toISOString();

export type Badge = { emoji: string; label: string; hint: string };

export type PublicProfile = {
  username: string;
  image: string | null;
  joinedAt: string;
  banned: boolean;
  bio: string;
  favorite: { slug: string; title: string; cover: string } | null;
  stats: { ratings: number; comments: number; topics: number; posts: number; lists: number };
  badges: Badge[];
  favoriteGenres: string[];
  rated: { slug: string; title: string; cover: string; score: number }[];
  lists: ListSummary[];
  recentComments: { body: string; spoiler: boolean; slug: string; seriesTitle: string; chapter: number | null; createdAt: string }[];
  topics: Pick<TopicSummary, "id" | "title" | "replyCount" | "lastPostAt">[];
};

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isMissingTable(e)) return fallback;
    throw e;
  }
}

function badgesFor(p: { joinedAt: Date; stats: PublicProfile["stats"]; chat: number }): Badge[] {
  const out: Badge[] = [];
  const days = (Date.now() - p.joinedAt.getTime()) / 86400000;
  if (days < 30) out.push({ emoji: "🌱", label: "Yeni üye", hint: "Son 30 günde katıldı" });
  if (days >= 365) out.push({ emoji: "🏛️", label: "Kıdemli", hint: "Bir yıldan uzun süredir üye" });
  if (p.stats.ratings >= 10) out.push({ emoji: "⭐", label: "Eleştirmen", hint: "10+ seri puanladı" });
  if (p.stats.comments >= 50) out.push({ emoji: "💬", label: "Yorumcu", hint: "50+ yorum yazdı" });
  if (p.stats.lists >= 3) out.push({ emoji: "📚", label: "Küratör", hint: "3+ öneri listesi hazırladı" });
  if (p.stats.topics + p.stats.posts >= 20) out.push({ emoji: "🗣️", label: "Forumcu", hint: "Forumda 20+ paylaşım" });
  if (p.chat >= 100) out.push({ emoji: "⚡", label: "Sohbet kuşu", hint: "Sohbette 100+ mesaj" });
  return out;
}

/** Profil verisi. Kullanıcı yoksa undefined, hesap tabloları yoksa null. */
export async function getPublicProfile(username: string): Promise<PublicProfile | null | undefined> {
  "use cache";
  cacheTag(PROFILE_TAG, RATING_TAG, LISTS_TAG, FORUM_TAG);
  cacheLife("minutes");

  let user: { id: string; image: string | null; createdAt: Date; banned: boolean } | undefined;
  try {
    [user] = await db
      .select({ id: users.id, image: users.image, createdAt: users.createdAt, banned: users.banned })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
  } catch (e) {
    if (isMissingTable(e)) return null;
    throw e;
  }
  if (!user) return undefined;
  const uid = user.id;

  const [profile, counts, rated, recentComments, topics, lists, genreRows] = await Promise.all([
    safe(
      async () =>
        (
          await db
            .select({ bio: profiles.bio, slug: series.slug, title: displayTitle, cover: series.cover })
            .from(profiles)
            .leftJoin(series, eq(series.id, profiles.favoriteSeriesId))
            .where(eq(profiles.userId, uid))
            .limit(1)
        )[0],
      undefined,
    ),
    safe(
      async () => {
        const n = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
        const [ratings, comm, tops, posts, chat] = await Promise.all([
          n(db.select({ n: count() }).from(seriesRatings).where(eq(seriesRatings.userId, uid))),
          n(db.select({ n: count() }).from(comments).where(and(eq(comments.userId, uid), eq(comments.deleted, false)))),
          n(db.select({ n: count() }).from(forumTopics).where(eq(forumTopics.userId, uid))),
          n(db.select({ n: count() }).from(forumPosts).where(and(eq(forumPosts.userId, uid), eq(forumPosts.deleted, false)))),
          n(db.select({ n: count() }).from(chatMessages).where(eq(chatMessages.userId, uid))),
        ]);
        return { ratings, comments: comm, topics: tops, posts, chat };
      },
      { ratings: 0, comments: 0, topics: 0, posts: 0, chat: 0 },
    ),
    safe(
      () =>
        db
          .select({ slug: series.slug, title: displayTitle, cover: series.cover, score: seriesRatings.score })
          .from(seriesRatings)
          .innerJoin(series, eq(series.id, seriesRatings.seriesId))
          .where(eq(seriesRatings.userId, uid))
          .orderBy(desc(seriesRatings.score), desc(seriesRatings.updatedAt))
          .limit(18),
      [],
    ),
    safe(
      () =>
        db
          .select({
            body: comments.body,
            spoiler: comments.spoiler,
            slug: series.slug,
            seriesTitle: displayTitle,
            chapter: chapters.number,
            createdAt: comments.createdAt,
          })
          .from(comments)
          .innerJoin(series, eq(series.id, comments.seriesId))
          .leftJoin(chapters, eq(chapters.id, comments.chapterId))
          .where(and(eq(comments.userId, uid), eq(comments.deleted, false), isNull(comments.parentId)))
          .orderBy(desc(comments.id))
          .limit(5),
      [],
    ),
    safe(
      () =>
        db
          .select({ id: forumTopics.id, title: forumTopics.title, replyCount: forumTopics.replyCount, lastPostAt: forumTopics.lastPostAt })
          .from(forumTopics)
          .where(eq(forumTopics.userId, uid))
          .orderBy(desc(forumTopics.lastPostAt))
          .limit(5),
      [],
    ),
    getUserLists(uid).then((l) => l ?? []),
    // Yüksek puan verdiği serilerin türleri
    safe(
      () =>
        db
          .select({ genre: sql<string>`unnest(${series.genres})` })
          .from(seriesRatings)
          .innerJoin(series, eq(series.id, seriesRatings.seriesId))
          .where(and(eq(seriesRatings.userId, uid), gte(seriesRatings.score, 7))),
      [],
    ),
  ]);

  const genreCount = new Map<string, number>();
  for (const { genre } of genreRows) genreCount.set(genre, (genreCount.get(genre) ?? 0) + 1);
  const stats = { ratings: counts.ratings, comments: counts.comments, topics: counts.topics, posts: counts.posts, lists: lists.length };

  return {
    username,
    image: user.image,
    joinedAt: iso(user.createdAt),
    banned: user.banned,
    bio: profile?.bio ?? "",
    favorite: profile?.slug ? { slug: profile.slug, title: profile.title ?? profile.slug, cover: profile.cover ?? "" } : null,
    stats,
    badges: badgesFor({ joinedAt: user.createdAt, stats, chat: counts.chat }),
    favoriteGenres: [...genreCount].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g),
    rated,
    lists,
    recentComments: recentComments.map((c) => ({ ...c, createdAt: iso(c.createdAt) })),
    topics: topics.map((t) => ({ ...t, lastPostAt: iso(t.lastPostAt) })),
  };
}
