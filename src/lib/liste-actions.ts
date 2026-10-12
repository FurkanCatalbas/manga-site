"use server";

// Öneri listesi işlemleri. Her işlem listenin sahibini doğrular.
import { and, count, eq, max, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/db";
import { listItems, lists, series } from "@/db/schema";
import { getSessionUser } from "@/lib/hesap";
import { LIST_LIMITS, LISTS_TAG, listTag } from "@/lib/listeler";
import { cleanText, currentMember, recentCount, type Result } from "@/lib/uye";

function refreshList(id: number) {
  updateTag(LISTS_TAG);
  updateTag(listTag(id));
}

async function seriesIdOf(slug: string) {
  const [s] = await db.select({ id: series.id }).from(series).where(eq(series.slug, String(slug))).limit(1);
  return s?.id;
}

/** Listenin sahibi giriş yapmış kullanıcı mı? */
async function ownList(listId: number) {
  const me = await currentMember();
  if (!me.user) return { error: me.error };
  const [l] = await db.select({ userId: lists.userId }).from(lists).where(eq(lists.id, Number(listId))).limit(1);
  if (!l || l.userId !== me.user.id) return { error: "Bu liste senin değil." };
  return { userId: me.user.id };
}

function cleanList(input: { title: string; description?: string }) {
  const title = cleanText(input.title).replace(/\s+/g, " ");
  const description = cleanText(input.description ?? "");
  if (title.length < 3 || title.length > LIST_LIMITS.title) return { error: `Liste adı 3–${LIST_LIMITS.title} karakter olmalı.` };
  if (description.length > LIST_LIMITS.description) return { error: `Açıklama en fazla ${LIST_LIMITS.description} karakter olabilir.` };
  return { title, description };
}

export async function createList(input: {
  title: string;
  description?: string;
  isPublic?: boolean;
  seriesSlug?: string | null;
}): Promise<Result<{ id: number }>> {
  const me = await currentMember();
  if (!me.user) return { ok: false, error: me.error };
  const v = cleanList(input);
  if ("error" in v) return { ok: false, error: v.error! };
  const [{ n }] = await db.select({ n: count() }).from(lists).where(eq(lists.userId, me.user.id));
  if (n >= LIST_LIMITS.lists) return { ok: false, error: `En fazla ${LIST_LIMITS.lists} liste oluşturabilirsin.` };
  if ((await recentCount(lists, lists.userId, lists.createdAt, me.user.id, 10)) > 0) {
    return { ok: false, error: "Biraz yavaş: 10 saniyede bir liste." };
  }
  const [row] = await db
    .insert(lists)
    .values({ userId: me.user.id, title: v.title!, description: v.description!, isPublic: input.isPublic ?? true })
    .returning({ id: lists.id });
  if (input.seriesSlug) {
    const sid = await seriesIdOf(input.seriesSlug);
    if (sid) await db.insert(listItems).values({ listId: row.id, seriesId: sid, position: 1 });
  }
  refreshList(row.id);
  return { ok: true, id: row.id };
}

export async function updateList(id: number, input: { title: string; description: string; isPublic: boolean }): Promise<Result> {
  const own = await ownList(id);
  if (own.error) return { ok: false, error: own.error };
  const v = cleanList(input);
  if ("error" in v) return { ok: false, error: v.error! };
  await db
    .update(lists)
    .set({ title: v.title!, description: v.description!, isPublic: !!input.isPublic, updatedAt: new Date() })
    .where(eq(lists.id, Number(id)));
  refreshList(Number(id));
  return { ok: true };
}

export async function deleteList(id: number): Promise<Result> {
  const own = await ownList(id);
  if (own.error) return { ok: false, error: own.error };
  await db.delete(lists).where(eq(lists.id, Number(id)));
  refreshList(Number(id));
  return { ok: true };
}

/** Seriyi listeye ekler; zaten varsa çıkarır. */
export async function toggleInList(listId: number, slug: string): Promise<Result<{ has: boolean }>> {
  const own = await ownList(listId);
  if (own.error) return { ok: false, error: own.error };
  const sid = await seriesIdOf(slug);
  if (!sid) return { ok: false, error: "Seri bulunamadı." };
  const where = and(eq(listItems.listId, Number(listId)), eq(listItems.seriesId, sid));
  const removed = await db.delete(listItems).where(where).returning({ s: listItems.seriesId });
  let has = false;
  if (!removed.length) {
    const [{ n, last }] = await db
      .select({ n: count(), last: max(listItems.position) })
      .from(listItems)
      .where(eq(listItems.listId, Number(listId)));
    if (n >= LIST_LIMITS.items) return { ok: false, error: `Bir listede en fazla ${LIST_LIMITS.items} seri olabilir.` };
    await db.insert(listItems).values({ listId: Number(listId), seriesId: sid, position: (last ?? 0) + 1 }).onConflictDoNothing();
    has = true;
  }
  await db.update(lists).set({ updatedAt: new Date() }).where(eq(lists.id, Number(listId)));
  refreshList(Number(listId));
  return { ok: true, has };
}

export async function setItemNote(listId: number, slug: string, note: string): Promise<Result> {
  const own = await ownList(listId);
  if (own.error) return { ok: false, error: own.error };
  const sid = await seriesIdOf(slug);
  if (!sid) return { ok: false, error: "Seri bulunamadı." };
  const text = cleanText(note).slice(0, LIST_LIMITS.note);
  await db.update(listItems).set({ note: text }).where(and(eq(listItems.listId, Number(listId)), eq(listItems.seriesId, sid)));
  refreshList(Number(listId));
  return { ok: true };
}

/** Seriyi bir yukarı (-1) ya da aşağı (1) taşır: komşusuyla yer değiştirir (tek ifade). */
export async function moveItem(listId: number, slug: string, dir: -1 | 1): Promise<Result> {
  const own = await ownList(listId);
  if (own.error) return { ok: false, error: own.error };
  const sid = await seriesIdOf(slug);
  if (!sid) return { ok: false, error: "Seri bulunamadı." };
  const lid = Number(listId);
  // Sıra numaralarını önce 1..n'e eşitle, sonra komşuyla değiştir
  await db.execute(sql`
    with ordered as (
      select series_id, row_number() over (order by position, added_at) as rn from ${listItems} where list_id = ${lid}
    ), me as (select rn from ordered where series_id = ${sid}),
    target as (select ordered.series_id, ordered.rn from ordered, me where ordered.rn = me.rn + ${dir === 1 ? 1 : -1})
    update ${listItems} li set position = case
        when li.series_id = ${sid} and exists (select 1 from target) then (select rn from target)
        when li.series_id = (select series_id from target) then (select rn from me)
        else o.rn end
    from ordered o where li.list_id = ${lid} and li.series_id = o.series_id`);
  refreshList(lid);
  return { ok: true };
}

/** Giriş yapmış kullanıcının listeleri ve seçili serinin hangilerinde olduğu ("Listeye ekle" menüsü). */
export async function myListsFor(slug: string): Promise<{ id: number; title: string; has: boolean; count: number }[] | null> {
  const me = await getSessionUser();
  if (!me) return null;
  const sid = (await seriesIdOf(slug)) ?? 0;
  try {
    const rows = await db
      .select({
        id: lists.id,
        title: lists.title,
        has: sql<boolean>`exists (select 1 from ${listItems} where ${listItems.listId} = ${lists.id} and ${listItems.seriesId} = ${sid})`,
        count: sql<number>`(select count(*) from ${listItems} where ${listItems.listId} = ${lists.id})::int`,
      })
      .from(lists)
      .where(eq(lists.userId, me.id))
      .orderBy(sql`${lists.updatedAt} desc`);
    return rows;
  } catch {
    return [];
  }
}

