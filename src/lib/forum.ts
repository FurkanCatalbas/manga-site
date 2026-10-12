// Forum okuma sorguları (yalnızca sunucuda). Yazma: src/lib/forum-actions.ts.
// Tablolar yoksa fonksiyonlar null döner; sayfalar "forum yakında" gösterir.
import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { forumPosts, forumTopics, series, users } from "@/db/schema";
import { isMissingTable } from "@/lib/genres";

/** Kategoriler kodda sabit; adres /forum/<slug>. */
export const FORUM_CATEGORIES = [
  { slug: "genel", name: "Genel sohbet", description: "Her konuda serbest sohbet, tanışma, gündem.", emoji: "💬" },
  { slug: "oneriler", name: "Seri önerileri", description: "Ne okusam? Öneri iste, sevdiklerini öner.", emoji: "📚" },
  { slug: "teoriler", name: "Teoriler ve tartışma", description: "Bölüm yorumları, tahminler, karakter analizleri.", emoji: "🧠" },
  { slug: "istekler", name: "Çeviri istekleri", description: "Sitede görmek istediğin seriler.", emoji: "🙏" },
  { slug: "site", name: "Site ve geri bildirim", description: "Hata bildirimi, öneri ve sorular.", emoji: "🛠️" },
] as const;
export type ForumCategory = (typeof FORUM_CATEGORIES)[number];
export const categoryOf = (slug: string) => FORUM_CATEGORIES.find((c) => c.slug === slug);

export const TOPIC_PAGE = 30;
export const POST_PAGE = 40;
export const FORUM_TAG = "forum";
export const topicTag = (id: number) => `forum-konu-${id}`;

export type Author = { username: string; image: string | null };

export type TopicSummary = {
  id: number;
  category: string;
  title: string;
  author: Author;
  replyCount: number;
  pinned: boolean;
  locked: boolean;
  lastPostAt: string;
  createdAt: string;
  series: { slug: string; title: string } | null;
};

export type PostView = { id: number; body: string; spoiler: boolean; deleted: boolean; createdAt: string; author: Author | null };

export type TopicView = TopicSummary & {
  body: string;
  spoiler: boolean;
  seriesCover: string | null;
  posts: PostView[];
  hasMore: boolean;
};

const iso = (d: Date | string) => new Date(d).toISOString();
const displayTitle = sql<string>`coalesce(nullif(trim(${series.titleEn}), ''), ${series.title})`;

const summaryColumns = {
  id: forumTopics.id,
  category: forumTopics.category,
  title: forumTopics.title,
  replyCount: forumTopics.replyCount,
  pinned: forumTopics.pinned,
  locked: forumTopics.locked,
  lastPostAt: forumTopics.lastPostAt,
  createdAt: forumTopics.createdAt,
  username: users.username,
  image: users.image,
  seriesSlug: series.slug,
  seriesTitle: displayTitle,
};

type SummaryRow = {
  id: number;
  category: string;
  title: string;
  replyCount: number;
  pinned: boolean;
  locked: boolean;
  lastPostAt: Date;
  createdAt: Date;
  username: string | null;
  image: string | null;
  seriesSlug: string | null;
  seriesTitle: string | null;
};

const toSummary = (r: SummaryRow): TopicSummary => ({
  id: r.id,
  category: r.category,
  title: r.title,
  author: { username: r.username ?? "okur", image: r.image },
  replyCount: r.replyCount,
  pinned: r.pinned,
  locked: r.locked,
  lastPostAt: iso(r.lastPostAt),
  createdAt: iso(r.createdAt),
  series: r.seriesSlug ? { slug: r.seriesSlug, title: r.seriesTitle ?? r.seriesSlug } : null,
});

const summaries = () =>
  db
    .select(summaryColumns)
    .from(forumTopics)
    .innerJoin(users, eq(users.id, forumTopics.userId))
    .leftJoin(series, eq(series.id, forumTopics.seriesId));

async function orNull<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    if (isMissingTable(e)) return null;
    throw e;
  }
}

/** Forum ana sayfası: kategori başına konu sayısı ve son etkinlik, en son hareketli konular. */
export async function getForumHome() {
  "use cache";
  cacheTag(FORUM_TAG);
  cacheLife("hours");
  return orNull(async () => {
    const [stats, latest] = await Promise.all([
      db
        .select({
          category: forumTopics.category,
          topics: sql<number>`count(*)::int`,
          posts: sql<number>`sum(${forumTopics.replyCount})::int`,
          last: sql<Date>`max(${forumTopics.lastPostAt})`,
        })
        .from(forumTopics)
        .groupBy(forumTopics.category),
      summaries().orderBy(desc(forumTopics.lastPostAt)).limit(12),
    ]);
    return {
      stats: Object.fromEntries(stats.map((s) => [s.category, { topics: s.topics, posts: s.posts ?? 0, last: s.last ? iso(s.last) : null }])),
      latest: latest.map(toSummary),
    };
  });
}

/** Kategorinin konuları: sabitlenenler önce, sonra son yanıta göre. `cursor` sonraki sayfa içindir. */
async function fetchTopics(category: string, cursor?: { at: string; id: number }) {
  const rows = await summaries()
    .where(
      and(
        eq(forumTopics.category, category),
        cursor
          ? and(
              eq(forumTopics.pinned, false),
              or(
                lt(forumTopics.lastPostAt, new Date(cursor.at)),
                and(eq(forumTopics.lastPostAt, new Date(cursor.at)), lt(forumTopics.id, cursor.id)),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(forumTopics.pinned), desc(forumTopics.lastPostAt), desc(forumTopics.id))
    .limit(TOPIC_PAGE + 1);
  return { topics: rows.slice(0, TOPIC_PAGE).map(toSummary), hasMore: rows.length > TOPIC_PAGE };
}

export async function getCategoryTopics(category: string) {
  "use cache";
  cacheTag(FORUM_TAG);
  cacheLife("hours");
  return orNull(() => fetchTopics(category));
}

export async function getMoreTopics(category: string, cursor: { at: string; id: number }) {
  return orNull(() => fetchTopics(category, cursor));
}

async function fetchPosts(topicId: number, after?: number) {
  const rows = await db
    .select({
      id: forumPosts.id,
      body: forumPosts.body,
      spoiler: forumPosts.spoiler,
      deleted: forumPosts.deleted,
      createdAt: forumPosts.createdAt,
      username: users.username,
      image: users.image,
    })
    .from(forumPosts)
    .innerJoin(users, eq(users.id, forumPosts.userId))
    .where(and(eq(forumPosts.topicId, topicId), after ? sql`${forumPosts.id} > ${after}` : undefined))
    .orderBy(forumPosts.id)
    .limit(POST_PAGE + 1);
  return {
    posts: rows.slice(0, POST_PAGE).map(
      (r): PostView => ({
        id: r.id,
        body: r.deleted ? "" : r.body,
        spoiler: r.spoiler,
        deleted: r.deleted,
        createdAt: iso(r.createdAt),
        author: r.deleted ? null : { username: r.username ?? "okur", image: r.image },
      }),
    ),
    hasMore: rows.length > POST_PAGE,
  };
}

/** Konu ve ilk yanıt sayfası. Bulunamazsa undefined, tablolar yoksa null. */
export async function getTopic(id: number): Promise<TopicView | null | undefined> {
  "use cache";
  cacheTag(FORUM_TAG, topicTag(id));
  cacheLife("hours");
  return orNull(async () => {
    const [row] = await db
      .select({
        ...summaryColumns,
        body: forumTopics.body,
        spoiler: forumTopics.spoiler,
        seriesCover: series.cover,
      })
      .from(forumTopics)
      .innerJoin(users, eq(users.id, forumTopics.userId))
      .leftJoin(series, eq(series.id, forumTopics.seriesId))
      .where(eq(forumTopics.id, id))
      .limit(1);
    if (!row) return undefined;
    const { posts, hasMore } = await fetchPosts(id);
    return { ...toSummary(row), body: row.body, spoiler: row.spoiler, seriesCover: row.seriesCover, posts, hasMore };
  });
}

export async function getMorePosts(topicId: number, after: number) {
  return orNull(() => fetchPosts(topicId, after));
}

/** Site haritası ve önceden üretilecek konu sayfaları için son konular. */
export async function getRecentTopicIds(limit = 200) {
  "use cache";
  cacheTag(FORUM_TAG);
  cacheLife("hours");
  return (
    (await orNull(() =>
      db
        .select({ id: forumTopics.id, lastPostAt: forumTopics.lastPostAt })
        .from(forumTopics)
        .orderBy(desc(forumTopics.lastPostAt))
        .limit(limit),
    )) ?? []
  ).map((r) => ({ id: r.id, lastPostAt: iso(r.lastPostAt) }));
}

/** Bir serinin bağlı olduğu son forum konuları (seri sayfası için). */
export async function getSeriesTopics(seriesSlug: string, limit = 5) {
  "use cache";
  cacheTag(FORUM_TAG);
  cacheLife("hours");
  return orNull(async () => {
    const rows = await summaries().where(eq(series.slug, seriesSlug)).orderBy(desc(forumTopics.lastPostAt)).limit(limit);
    return rows.map(toSummary);
  });
}

