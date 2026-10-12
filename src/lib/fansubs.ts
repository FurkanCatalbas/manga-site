// Çeviri kaynakları (fansub) sorguları (yalnızca sunucuda).
// Tablolar veritabanında yoksa (db:push yapılmamışsa) site bozulmaz: okuma sorguları boş döner.
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { fansubs, seriesFansubs } from "@/db/schema";
import { isMissingTable } from "@/lib/genres";

export type FansubRow = { id: number; name: string; slug: string; url: string | null; logo: string | null; count: number };

/** Panel: tüm kaynaklar ve her birinden alınan seri sayısı. Tablo yoksa null. */
export async function getFansubList(): Promise<FansubRow[] | null> {
  try {
    const rows = await db
      .select({
        id: fansubs.id,
        name: fansubs.name,
        slug: fansubs.slug,
        url: fansubs.url,
        logo: fansubs.logo,
        count: sql<number>`(select count(*) from ${seriesFansubs} where ${seriesFansubs.fansubId} = ${fansubs.id})::int`,
      })
      .from(fansubs);
    return rows.sort((a, b) => a.name.localeCompare(b.name, "tr"));
  } catch (e) {
    if (isMissingTable(e)) return null;
    throw e;
  }
}

/** Panel: serinin seçili kaynağı ve seriye özel adresi. */
export async function getSeriesFansub(seriesId: number): Promise<{ fansubId: number; url: string | null } | null> {
  try {
    const [row] = await db
      .select({ fansubId: seriesFansubs.fansubId, url: seriesFansubs.url })
      .from(seriesFansubs)
      .where(eq(seriesFansubs.seriesId, seriesId));
    return row ?? null;
  } catch (e) {
    if (isMissingTable(e)) return null;
    throw e;
  }
}

/** Serinin kaynağını ayarlar; fansubId null ise kaldırır. Tablo yoksa sessizce geçer. */
export async function setSeriesFansub(seriesId: number, fansubId: number | null, url: string | null) {
  try {
    if (fansubId === null) {
      await db.delete(seriesFansubs).where(eq(seriesFansubs.seriesId, seriesId));
      return;
    }
    await db
      .insert(seriesFansubs)
      .values({ seriesId, fansubId, url })
      .onConflictDoUpdate({ target: seriesFansubs.seriesId, set: { fansubId, url } });
  } catch (e) {
    if (!isMissingTable(e)) throw e;
  }
}

/** Bağlantı yalnızca http(s) olabilir (javascript: gibi adresler engellenir); şemasız yazılırsa https eklenir. */
export function cleanUrl(raw: string): { url: string | null } | { error: string } {
  const v = raw.trim();
  if (!v) return { url: null };
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`);
    if (u.protocol !== "https:" && u.protocol !== "http:") return { error: "Bağlantı http ya da https olmalı." };
    if (!u.hostname.includes(".")) return { error: "Bağlantı geçerli bir site adresi değil." };
    return { url: u.toString() };
  } catch {
    return { error: "Bağlantı geçerli bir adres değil." };
  }
}
