// Kullanıcıların öneri listeleri: okuma sorguları (yalnızca sunucuda). Yazma: src/lib/liste-actions.ts.
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { listItems, lists, series, users } from "@/db/schema";
import { isMissingTable } from "@/lib/genres";

export const LISTS_TAG = "listeler";
export const listTag = (id: number) => `liste-${id}`;
export const LIST_LIMITS = { lists: 50, items: 200, title: 80, description: 500, note: 200 };

export type ListSummary = {
  id: number;
  title: string;
  description: string;
  isPublic: boolean;
  owner: { username: string; image: string | null };
  itemCount: number;
  covers: string[];
  updatedAt: string;
};

export type ListItemView = { slug: string; title: string; cover: string; note: string; status: string };
export type ListView = ListSummary & { userId: string; items: ListItemView[] };

const displayTitle = sql<string>`coalesce(nullif(trim(${series.titleEn}), ''), ${series.title})`;
const iso = (d: Date | string) => new Date(d).toISOString();

async function orNull<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    if (isMissingTable(e)) return null;
    throw e;
  }
}

/** Listelerin özetleri: ilk 4 kapak ve seri sayısıyla. */
async function summarize(where: ReturnType<typeof and>, limit: number): Promise<ListSummary[]> {
  const rows = await db
    .select({
      id: lists.id,
      title: lists.title,
      description: lists.description,
      isPublic: lists.isPublic,
      updatedAt: lists.updatedAt,
      username: users.username,
      image: users.image,
      itemCount: sql<number>`(select count(*) from ${listItems} where ${listItems.listId} = ${lists.id})::int`,
    })
    .from(lists)
    .innerJoin(users, eq(users.id, lists.userId))
    .where(where)
    .orderBy(desc(lists.updatedAt))
    .limit(limit);
  const ids = rows.map((r) => r.id);
  const covers = ids.length
    ? await db
        .select({ listId: listItems.listId, cover: series.cover, position: listItems.position })
        .from(listItems)
        .innerJoin(series, eq(series.id, listItems.seriesId))
        .where(inArray(listItems.listId, ids))
        .orderBy(asc(listItems.position))
    : [];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    isPublic: r.isPublic,
    owner: { username: r.username ?? "okur", image: r.image },
    itemCount: r.itemCount,
    covers: covers.filter((c) => c.listId === r.id).slice(0, 4).map((c) => c.cover),
    updatedAt: iso(r.updatedAt),
  }));
}

/** Keşif: herkese açık, en az bir serisi olan son güncellenen listeler. */
export async function getRecentLists(limit = 24) {
  "use cache";
  cacheTag(LISTS_TAG);
  cacheLife("hours");
  return orNull(() =>
    summarize(and(eq(lists.isPublic, true), sql`exists (select 1 from ${listItems} where ${listItems.listId} = ${lists.id})`), limit),
  );
}

/** Bir kullanıcının herkese açık listeleri (profil için). */
export async function getUserLists(userId: string) {
  "use cache";
  cacheTag(LISTS_TAG);
  cacheLife("hours");
  return orNull(() => summarize(and(eq(lists.userId, userId), eq(lists.isPublic, true)), 50));
}

/** Bir serinin geçtiği herkese açık listeler (seri sayfası için). */
export async function getListsWithSeries(seriesSlug: string, limit = 6) {
  "use cache";
  cacheTag(LISTS_TAG);
  cacheLife("hours");
  return orNull(() =>
    summarize(
      and(
        eq(lists.isPublic, true),
        sql`exists (select 1 from ${listItems} join ${series} on ${series.id} = ${listItems.seriesId}
          where ${listItems.listId} = ${lists.id} and ${series.slug} = ${seriesSlug})`,
      ),
      limit,
    ),
  );
}

/** Liste ve serileri. Bulunamazsa undefined, tablolar yoksa null. Gizlilik kontrolü çağıranın işidir. */
export async function getList(id: number): Promise<ListView | null | undefined> {
  "use cache";
  cacheTag(LISTS_TAG, listTag(id));
  cacheLife("hours");
  return orNull(async () => {
    const [summary] = await summarize(and(eq(lists.id, id), gt(lists.id, 0)), 1);
    if (!summary) return undefined;
    const [{ userId }] = await db.select({ userId: lists.userId }).from(lists).where(eq(lists.id, id));
    const items = await db
      .select({ slug: series.slug, title: displayTitle, cover: series.cover, note: listItems.note, status: series.status })
      .from(listItems)
      .innerJoin(series, eq(series.id, listItems.seriesId))
      .where(eq(listItems.listId, id))
      .orderBy(asc(listItems.position), asc(listItems.addedAt));
    return { ...summary, userId, items };
  });
}
