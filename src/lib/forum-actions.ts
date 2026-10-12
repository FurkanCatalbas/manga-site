"use server";

// Forum işlemleri: konu açma, yanıtlama, kendi içeriğini silme, şikâyet ve sayfalama.
import { and, eq, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/db";
import { forumPosts, forumReports, forumTopics, series } from "@/db/schema";
import { getSessionUser } from "@/lib/hesap";
import { categoryOf, FORUM_TAG, getMorePosts, getMoreTopics, type PostView, topicTag } from "@/lib/forum";
import { cleanText, currentMember, linkCount, LOGIN, recentCount, type Result } from "@/lib/uye";

const TITLE = { min: 5, max: 120 };
const BODY = { min: 10, max: 5000 };
const REPLY = { min: 2, max: 5000 };

export async function createTopic(input: {
  category: string;
  title: string;
  body: string;
  spoiler: boolean;
  seriesSlug?: string | null;
}): Promise<Result<{ id: number }>> {
  const me = await currentMember();
  if (!me.user) return { ok: false, error: me.error };
  if (!categoryOf(String(input.category))) return { ok: false, error: "Bir kategori seç." };
  const title = cleanText(input.title).replace(/\s+/g, " ");
  const body = cleanText(input.body);
  if (title.length < TITLE.min || title.length > TITLE.max) return { ok: false, error: `Başlık ${TITLE.min}–${TITLE.max} karakter olmalı.` };
  if (body.length < BODY.min || body.length > BODY.max) return { ok: false, error: `Metin ${BODY.min}–${BODY.max} karakter olmalı.` };
  if (linkCount(body) > 3) return { ok: false, error: "En fazla 3 bağlantı ekleyebilirsin." };

  if ((await recentCount(forumTopics, forumTopics.userId, forumTopics.createdAt, me.user.id, 120)) > 0) {
    return { ok: false, error: "İki dakikada bir konu açabilirsin." };
  }
  if ((await recentCount(forumTopics, forumTopics.userId, forumTopics.createdAt, me.user.id, 86400)) >= 10) {
    return { ok: false, error: "Bugünlük konu sınırına ulaştın." };
  }

  let seriesId: number | null = null;
  if (input.seriesSlug) {
    const [s] = await db.select({ id: series.id }).from(series).where(eq(series.slug, String(input.seriesSlug))).limit(1);
    seriesId = s?.id ?? null;
  }
  const [row] = await db
    .insert(forumTopics)
    .values({ category: input.category, userId: me.user.id, seriesId, title, body, spoiler: !!input.spoiler })
    .returning({ id: forumTopics.id });
  updateTag(FORUM_TAG);
  return { ok: true, id: row.id };
}

export async function replyTopic(input: { topicId: number; body: string; spoiler: boolean }): Promise<Result<{ post: PostView }>> {
  const me = await currentMember();
  if (!me.user) return { ok: false, error: me.error };
  const topicId = Number(input.topicId);
  const body = cleanText(input.body);
  if (body.length < REPLY.min || body.length > REPLY.max) return { ok: false, error: `Yanıt ${REPLY.min}–${REPLY.max} karakter olmalı.` };
  if (linkCount(body) > 3) return { ok: false, error: "En fazla 3 bağlantı ekleyebilirsin." };

  const [topic] = await db.select({ locked: forumTopics.locked }).from(forumTopics).where(eq(forumTopics.id, topicId)).limit(1);
  if (!topic) return { ok: false, error: "Konu bulunamadı." };
  if (topic.locked) return { ok: false, error: "Bu konu yanıtlara kapatıldı." };
  if ((await recentCount(forumPosts, forumPosts.userId, forumPosts.createdAt, me.user.id, 15)) > 0) {
    return { ok: false, error: "Biraz yavaş: 15 saniyede bir yanıt yazabilirsin." };
  }
  if ((await recentCount(forumPosts, forumPosts.userId, forumPosts.createdAt, me.user.id, 86400)) >= 200) {
    return { ok: false, error: "Bugünlük yanıt sınırına ulaştın." };
  }

  // Yanıt ve konunun sayacı tek ifadede
  const res = await db.execute<{ id: number; created_at: string }>(sql`
    with p as (
      insert into ${forumPosts} (topic_id, user_id, body, spoiler)
      values (${topicId}, ${me.user.id}, ${body}, ${!!input.spoiler})
      returning id, created_at
    ), t as (
      update ${forumTopics} set reply_count = reply_count + 1, last_post_at = (select created_at from p)
      where id = ${topicId}
    )
    select id, created_at from p`);
  const row = res.rows[0];
  updateTag(FORUM_TAG);
  updateTag(topicTag(topicId));
  return {
    ok: true,
    post: {
      id: Number(row.id),
      body,
      spoiler: !!input.spoiler,
      deleted: false,
      createdAt: new Date(row.created_at).toISOString(),
      author: { username: me.user.username, image: me.user.image },
    },
  };
}

/** Kendi yanıtını siler (yerinde "silindi" yazar). */
export async function deletePost(postId: number): Promise<Result> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: LOGIN };
  const [p] = await db
    .update(forumPosts)
    .set({ deleted: true, body: "" })
    .where(and(eq(forumPosts.id, Number(postId)), eq(forumPosts.userId, me.id), eq(forumPosts.deleted, false)))
    .returning({ topicId: forumPosts.topicId });
  if (!p) return { ok: false, error: "Bu yanıtı silemezsin." };
  updateTag(topicTag(p.topicId));
  return { ok: true };
}

/** Kendi konusunu siler; yanıt almış konular yalnızca yöneticiye bildirilerek kaldırılır. */
export async function deleteTopic(topicId: number): Promise<Result> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: LOGIN };
  const [t] = await db
    .select({ userId: forumTopics.userId, replies: forumTopics.replyCount })
    .from(forumTopics)
    .where(eq(forumTopics.id, Number(topicId)))
    .limit(1);
  if (!t || t.userId !== me.id) return { ok: false, error: "Bu konuyu silemezsin." };
  if (t.replies > 0) return { ok: false, error: "Yanıt almış konular silinemez. Kaldırılmasını istiyorsan şikâyet et." };
  await db.delete(forumTopics).where(eq(forumTopics.id, Number(topicId)));
  updateTag(FORUM_TAG);
  updateTag(topicTag(Number(topicId)));
  return { ok: true };
}

export async function reportForum(input: { topicId: number; postId?: number | null; reason: string }): Promise<Result> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: LOGIN };
  const reason = cleanText(input.reason).slice(0, 300) || "Belirtilmedi";
  await db
    .insert(forumReports)
    .values({ topicId: Number(input.topicId), postId: input.postId ? Number(input.postId) : null, userId: me.id, reason });
  return { ok: true };
}

export async function loadMoreTopics(category: string, cursor: { at: string; id: number }) {
  return getMoreTopics(String(category), { at: String(cursor.at), id: Number(cursor.id) });
}

export async function loadMorePosts(topicId: number, after: number) {
  return getMorePosts(Number(topicId), Number(after));
}
