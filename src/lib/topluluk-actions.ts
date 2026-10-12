"use server";

// Yorum ve tepki işlemleri. Her işlem oturumu sunucuda doğrular; istemciden gelen kimliklere güvenilmez,
// seri adresi ve bölüm numarası sunucuda veritabanı kimliğine çevrilir.
import { and, count, eq, gt, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/db";
import { chapterReactions, commentLikes, commentReports, comments } from "@/db/schema";
import { getSessionUser } from "@/lib/hesap";
import {
  COMMENT_MAX,
  type CommentPage,
  type CommentView,
  getMoreComments,
  isReactionKind,
  reactionTag,
  resolveScope,
  type ScopeRef,
  scopeTag,
} from "@/lib/topluluk";
import { currentMember, LOGIN, type Result } from "@/lib/uye";

const COOLDOWN_SECONDS = 20;
const DAILY_LIMIT = 100;
const currentUser = currentMember;

function cleanRef(ref: ScopeRef): ScopeRef | null {
  const slug = String(ref?.slug ?? "");
  const chapter = ref?.chapter == null ? null : Number(ref.chapter);
  if (!slug || (chapter !== null && !Number.isInteger(chapter))) return null;
  return { slug, chapter };
}

export async function postComment(input: {
  ref: ScopeRef;
  body: string;
  spoiler: boolean;
  parentId?: number | null;
}): Promise<Result<{ comment: CommentView; parentId: number | null }>> {
  const me = await currentUser();
  if (!me.user) return { ok: false, error: me.error };
  const ref = cleanRef(input.ref);
  const scope = ref && (await resolveScope(ref));
  if (!scope) return { ok: false, error: "Seri ya da bölüm bulunamadı." };

  const body = String(input.body ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (body.length < 2) return { ok: false, error: "Yorum çok kısa." };
  if (body.length > COMMENT_MAX) return { ok: false, error: `Yorum en fazla ${COMMENT_MAX} karakter olabilir.` };
  if ((body.match(/https?:\/\/|www\./gi)?.length ?? 0) > 2) return { ok: false, error: "Yorumda en fazla 2 bağlantı olabilir." };

  // Yanıt, üst yorumun bulunduğu yere eklenir; yanıta yanıt verilirse aynı başlığa düşer (tek seviye)
  let parentId: number | null = null;
  if (input.parentId) {
    const [parent] = await db
      .select({ id: comments.id, parentId: comments.parentId, seriesId: comments.seriesId, chapterId: comments.chapterId })
      .from(comments)
      .where(eq(comments.id, Number(input.parentId)))
      .limit(1);
    if (!parent || parent.seriesId !== scope.seriesId || parent.chapterId !== scope.chapterId) {
      return { ok: false, error: "Yanıtlanan yorum bulunamadı." };
    }
    parentId = parent.parentId ?? parent.id;
  }

  // Sel ve reklam önlemi: kısa aralıkla ve günde çok fazla yorum yazılamaz
  const [{ recent }] = await db
    .select({ recent: count() })
    .from(comments)
    .where(and(eq(comments.userId, me.user.id), gt(comments.createdAt, sql`now() - interval '${sql.raw(String(COOLDOWN_SECONDS))} seconds'`)));
  if (recent > 0) return { ok: false, error: `Biraz yavaş: ${COOLDOWN_SECONDS} saniyede bir yorum yazabilirsin.` };
  const [{ today }] = await db
    .select({ today: count() })
    .from(comments)
    .where(and(eq(comments.userId, me.user.id), gt(comments.createdAt, sql`now() - interval '1 day'`)));
  if (today >= DAILY_LIMIT) return { ok: false, error: "Bugünlük yorum sınırına ulaştın." };

  const [row] = await db
    .insert(comments)
    .values({
      seriesId: scope.seriesId,
      chapterId: scope.chapterId,
      userId: me.user.id,
      parentId,
      body,
      spoiler: !!input.spoiler,
    })
    .returning({ id: comments.id, createdAt: comments.createdAt });
  updateTag(scopeTag(scope.key));

  return {
    ok: true,
    parentId,
    comment: {
      id: row.id,
      body,
      spoiler: !!input.spoiler,
      likes: 0,
      deleted: false,
      createdAt: row.createdAt.toISOString(),
      user: { username: me.user.username, image: me.user.image },
      replies: [],
    },
  };
}

/** Kendi yorumunu siler. Yanıtı varsa metni gizlenir ("Bu yorum silindi"), yoksa tamamen silinir. */
export async function deleteComment(ref: ScopeRef, id: number): Promise<Result> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: LOGIN };
  const [c] = await db
    .select({ id: comments.id, userId: comments.userId })
    .from(comments)
    .where(eq(comments.id, Number(id)))
    .limit(1);
  if (!c || c.userId !== me.id) return { ok: false, error: "Bu yorumu silemezsin." };
  const [{ replies }] = await db.select({ replies: count() }).from(comments).where(eq(comments.parentId, c.id));
  if (replies > 0) await db.update(comments).set({ deleted: true, body: "" }).where(eq(comments.id, c.id));
  else await db.delete(comments).where(eq(comments.id, c.id));
  const scope = cleanRef(ref) && (await resolveScope(cleanRef(ref)!));
  if (scope) updateTag(scopeTag(scope.key));
  return { ok: true };
}

/** Beğeniyi açar/kapatır; beğeni sayısı tek SQL ifadesiyle güncellenir. */
export async function toggleLike(ref: ScopeRef, id: number): Promise<Result<{ liked: boolean; likes: number }>> {
  const me = await currentUser();
  if (!me.user) return { ok: false, error: me.error };
  const commentId = Number(id);
  const userId = me.user.id;
  // Beğeni varsa sil, yoksa ekle; sonra sayacı gerçek sayıya eşitle
  const rows = await db.execute<{ liked: boolean; likes: number }>(sql`
    with removed as (
      delete from ${commentLikes} where comment_id = ${commentId} and user_id = ${userId} returning 1
    ), added as (
      insert into ${commentLikes} (comment_id, user_id)
      select ${commentId}, ${userId}
      where not exists (select 1 from removed) and exists (select 1 from ${comments} where id = ${commentId} and not deleted)
      on conflict do nothing
      returning 1
    ), updated as (
      update ${comments} set likes = greatest(likes + (select count(*) from added) - (select count(*) from removed), 0)
      where id = ${commentId}
      returning likes
    )
    select exists (select 1 from added) as liked, coalesce((select likes from updated), 0)::int as likes`);
  const r = rows.rows[0];
  const scope = cleanRef(ref) && (await resolveScope(cleanRef(ref)!));
  if (scope) updateTag(scopeTag(scope.key));
  return { ok: true, liked: !!r?.liked, likes: Number(r?.likes ?? 0) };
}

/** Giriş yapmış kullanıcının bu yerdeki beğendiği yorumlar (sayfa açılınca kalpleri boyamak için). */
export async function myLikes(ref: ScopeRef): Promise<number[]> {
  const me = await getSessionUser();
  const clean = cleanRef(ref);
  const scope = me && clean && (await resolveScope(clean));
  if (!me || !scope) return [];
  const rows = await db
    .select({ id: commentLikes.commentId })
    .from(commentLikes)
    .innerJoin(comments, eq(comments.id, commentLikes.commentId))
    .where(
      and(
        eq(commentLikes.userId, me.id),
        eq(comments.seriesId, scope.seriesId),
        scope.chapterId === null ? sql`${comments.chapterId} is null` : eq(comments.chapterId, scope.chapterId),
      ),
    );
  return rows.map((r) => r.id);
}

export async function loadMoreComments(ref: ScopeRef, before: number): Promise<CommentPage | null> {
  const clean = cleanRef(ref);
  const scope = clean && (await resolveScope(clean));
  return scope ? getMoreComments(scope, Number(before)) : null;
}

export async function reportComment(id: number, reason: string): Promise<Result> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: LOGIN };
  const text = String(reason ?? "").trim().slice(0, 300) || "Belirtilmedi";
  await db
    .insert(commentReports)
    .values({ commentId: Number(id), userId: me.id, reason: text })
    .onConflictDoNothing();
  return { ok: true };
}

// --- Tepkiler ---

/** Tepki verir; aynı tepkiye tekrar dokunulursa geri alır. Güncel sayıları ve seçimi döner. */
export async function react(ref: ScopeRef, kind: string): Promise<Result<{ mine: string | null }>> {
  const me = await currentUser();
  if (!me.user) return { ok: false, error: me.error };
  if (!isReactionKind(kind)) return { ok: false, error: "Geçersiz tepki." };
  const clean = cleanRef(ref);
  const scope = clean && (await resolveScope(clean));
  if (!scope?.chapterId) return { ok: false, error: "Bölüm bulunamadı." };

  const [existing] = await db
    .select({ kind: chapterReactions.kind })
    .from(chapterReactions)
    .where(and(eq(chapterReactions.chapterId, scope.chapterId), eq(chapterReactions.userId, me.user.id)))
    .limit(1);
  let mine: string | null = kind;
  if (existing?.kind === kind) {
    await db
      .delete(chapterReactions)
      .where(and(eq(chapterReactions.chapterId, scope.chapterId), eq(chapterReactions.userId, me.user.id)));
    mine = null;
  } else {
    await db
      .insert(chapterReactions)
      .values({ chapterId: scope.chapterId, userId: me.user.id, kind })
      .onConflictDoUpdate({ target: [chapterReactions.chapterId, chapterReactions.userId], set: { kind, createdAt: new Date() } });
  }
  updateTag(reactionTag(scope.chapterId));
  return { ok: true, mine };
}

export async function myReaction(ref: ScopeRef): Promise<string | null> {
  const me = await getSessionUser();
  const clean = cleanRef(ref);
  const scope = me && clean && (await resolveScope(clean));
  if (!me || !scope?.chapterId) return null;
  const [r] = await db
    .select({ kind: chapterReactions.kind })
    .from(chapterReactions)
    .where(and(eq(chapterReactions.chapterId, scope.chapterId), eq(chapterReactions.userId, me.id)))
    .limit(1);
  return r?.kind ?? null;
}
