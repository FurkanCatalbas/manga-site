// Topluluk işlemlerinde ortak üye kontrolü ve sınırlar (yalnızca sunucuda; server action'lar kullanır).
import { and, count, eq, gt, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser, type SessionUser } from "@/lib/hesap";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export const LOGIN = "Bunun için giriş yapmalısın.";
export const BANNED = "Hesabın topluluk özelliklerine kapatıldı.";

/** Giriş yapmış ve engellenmemiş üye. Oturum çerezi birkaç dakika önbellekli olduğu için engel durumu
 * her işlemde veritabanından okunur. */
export async function currentMember(): Promise<{ user: SessionUser; error?: undefined } | { user?: undefined; error: string }> {
  const user = await getSessionUser();
  if (!user) return { error: LOGIN };
  const [row] = await db.select({ banned: users.banned }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!row || row.banned) return { error: row ? BANNED : LOGIN };
  return { user };
}

/** Kullanıcının bir tabloda son `seconds` saniyede kaç kaydı var (hız sınırı için). */
export async function recentCount(table: PgTable, userCol: PgColumn, timeCol: PgColumn, userId: string, seconds: number, extra?: SQL) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(table)
    .where(and(eq(userCol, userId), gt(timeCol, sql`now() - make_interval(secs => ${seconds})`), extra));
  return n;
}

/** Metni temizler: satır sonları, fazla boş satırlar, baş/son boşluk. */
export function cleanText(raw: unknown) {
  return String(raw ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const linkCount = (text: string) => text.match(/https?:\/\/|www\./gi)?.length ?? 0;
