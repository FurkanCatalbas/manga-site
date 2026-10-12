// Yorumlar ve tepkiler: okuma sorguları (yalnızca sunucuda). Yazma işlemleri src/app/topluluk/actions.ts.
// Tablolar veritabanında yoksa (SQL çalıştırılmadıysa) okuma sorguları null döner, bölümler görünmez.
import { and, asc, count, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { chapterReactions, chapters, comments, series, users } from "@/db/schema";
import { isMissingTable } from "@/lib/genres";

export const COMMENT_PAGE = 20;
export const COMMENT_MAX = 2000;

/** Bölüm sonu tepkileri (sıra ekrandaki sıradır). */
export const REACTIONS = [
  { id: "bayildim", emoji: "😍", label: "Bayıldım" },
  { id: "efsane", emoji: "🔥", label: "Efsane" },
  { id: "komik", emoji: "😂", label: "Komik" },
  { id: "sasirdim", emoji: "😮", label: "Şaşırdım" },
  { id: "uzgun", emoji: "😢", label: "Üzgün" },
] as const;
export type ReactionKind = (typeof REACTIONS)[number]["id"];
export const isReactionKind = (v: unknown): v is ReactionKind => REACTIONS.some((r) => r.id === v);

/** Yorumların ait olduğu yer: seri sayfası (chapter yok) ya da bölüm. */
export type ScopeRef = { slug: string; chapter?: number | null };
export type Scope = { seriesId: number; chapterId: number | null; key: string };

export type CommentView = {
  id: number;
  body: string; // silinmişse boş
  spoiler: boolean;
  likes: number;
  deleted: boolean;
  createdAt: string;
  user: { username: string; image: string | null } | null; // silinmiş yorumda null
  replies: CommentView[];
};

export type CommentPage = { total: number; threads: CommentView[]; hasMore: boolean };

export const scopeTag = (key: string) => `yorum-${key}`;
export const reactionTag = (chapterId: number) => `tepki-${chapterId}`;

/** Seri adresi ve bölüm numarasından veritabanı kimlikleri; yoksa null. */
export async function resolveScope(ref: ScopeRef): Promise<Scope | null> {
  "use cache";
  cacheTag("series");
  cacheLife("hours");

  const [s] = await db.select({ id: series.id }).from(series).where(eq(series.slug, ref.slug)).limit(1);
  if (!s) return null;
  if (ref.chapter == null) return { seriesId: s.id, chapterId: null, key: `s${s.id}` };
  const [c] = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(and(eq(chapters.seriesId, s.id), eq(chapters.number, ref.chapter)))
    .limit(1);
  return c ? { seriesId: s.id, chapterId: c.id, key: `c${c.id}` } : null;
}

const scopeWhere = (scope: Scope) =>
  and(
    eq(comments.seriesId, scope.seriesId),
    scope.chapterId === null ? isNull(comments.chapterId) : eq(comments.chapterId, scope.chapterId),
  );

const commentColumns = {
  id: comments.id,
  parentId: comments.parentId,
  body: comments.body,
  spoiler: comments.spoiler,
  likes: comments.likes,
  deleted: comments.deleted,
  createdAt: comments.createdAt,
  username: users.username,
  image: users.image,
};

type Row = {
  id: number;
  parentId: number | null;
  body: string;
  spoiler: boolean;
  likes: number;
  deleted: boolean;
  createdAt: Date | string;
  username: string | null;
  image: string | null;
};

function toView(r: Row): CommentView {
  return {
    id: r.id,
    body: r.deleted ? "" : r.body,
    spoiler: r.spoiler,
    likes: r.likes,
    deleted: r.deleted,
    createdAt: new Date(r.createdAt).toISOString(),
    user: r.deleted ? null : { username: r.username ?? "okur", image: r.image },
    replies: [],
  };
}

/** Bir sayfa yorum: en yeni üst yorumlar ve tüm yanıtları (eskiden yeniye). `before`: bu kimlikten eskiler. */
async function fetchComments(scope: Scope, before?: number): Promise<CommentPage> {
  const where = scopeWhere(scope);
  const [tops, [{ total }]] = await Promise.all([
    db
      .select(commentColumns)
      .from(comments)
      .innerJoin(users, eq(users.id, comments.userId))
      .where(and(where, isNull(comments.parentId), before ? lt(comments.id, before) : undefined))
      .orderBy(desc(comments.id))
      .limit(COMMENT_PAGE + 1),
    db.select({ total: count() }).from(comments).where(and(where, eq(comments.deleted, false))),
  ]);
  const page = tops.slice(0, COMMENT_PAGE);
  const ids = page.map((t) => t.id);
  const replies = ids.length
    ? await db
        .select(commentColumns)
        .from(comments)
        .innerJoin(users, eq(users.id, comments.userId))
        .where(inArray(comments.parentId, ids))
        .orderBy(asc(comments.id))
    : [];
  const threads = page.map((t) => ({
    ...toView(t),
    replies: replies.filter((r) => r.parentId === t.id).map((r) => toView(r)),
  }));
  return { total, threads, hasMore: tops.length > COMMENT_PAGE };
}

/** İlk sayfa (önbellekli; yorum yazılınca/silinince yenilenir). Tablolar yoksa null. */
export async function getComments(scope: Scope): Promise<CommentPage | null> {
  "use cache";
  cacheTag(scopeTag(scope.key), "series");
  try {
    const page = await fetchComments(scope);
    cacheLife("days");
    return page;
  } catch (e) {
    if (!isMissingTable(e)) throw e;
    // Tablolar yoksa kısa süre tut: SQL çalıştırılınca kısa sürede açılsın
    cacheLife("minutes");
    return null;
  }
}

/** Sonraki sayfalar (önbelleksiz). */
export async function getMoreComments(scope: Scope, before: number) {
  return fetchComments(scope, before);
}

/** Bölümün tepki sayıları. Tablolar yoksa null. */
export async function getReactionCounts(chapterId: number): Promise<Record<ReactionKind, number> | null> {
  "use cache";
  cacheTag(reactionTag(chapterId), "series");
  try {
    const rows = await db
      .select({ kind: chapterReactions.kind, n: sql<number>`count(*)::int` })
      .from(chapterReactions)
      .where(eq(chapterReactions.chapterId, chapterId))
      .groupBy(chapterReactions.kind);
    const counts = Object.fromEntries(REACTIONS.map((r) => [r.id, 0])) as Record<ReactionKind, number>;
    for (const r of rows) if (isReactionKind(r.kind)) counts[r.kind] = r.n;
    cacheLife("days");
    return counts;
  } catch (e) {
    if (!isMissingTable(e)) throw e;
    cacheLife("minutes");
    return null;
  }
}
