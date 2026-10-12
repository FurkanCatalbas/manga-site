// Çeviri kaynakları (fansub) sorguları (yalnızca sunucuda).
// Tablolar veritabanında yoksa (db:push yapılmamışsa) site bozulmaz: okuma sorguları boş döner.
import { eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { fansubs, series, seriesFansubs } from "@/db/schema";
import { isMissingTable } from "@/lib/genres";

/** Sitede gösterilen kaynak notu: "Bu çeviri {name} ({domain}) üzerinden alınmıştır". */
export type SeriesSource = { name: string; logo: string | null; link: string | null; domain: string | null };
export type FansubRow = { id: number; name: string; slug: string; url: string | null; logo: string | null; count: number };

/** "https://www.merlintoon.com/seri/x" → "merlintoon.com" */
export function domainOf(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Serinin çeviri kaynağı; yoksa (ya da tablolar yoksa) null. */
export async function getSeriesSource(seriesSlug: string): Promise<SeriesSource | null> {
  "use cache";
  cacheTag("series");
  cacheLife("hours");

  try {
    const [row] = await db
      .select({ name: fansubs.name, logo: fansubs.logo, siteUrl: fansubs.url, seriesUrl: seriesFansubs.url })
      .from(seriesFansubs)
      .innerJoin(fansubs, eq(fansubs.id, seriesFansubs.fansubId))
      .innerJoin(series, eq(series.id, seriesFansubs.seriesId))
      .where(eq(series.slug, seriesSlug));
    if (!row) return null;
    // Bağlantı önce serinin kaynak sitedeki sayfasına, yoksa ekibin sitesine gider
    const link = row.seriesUrl ?? row.siteUrl;
    return { name: row.name, logo: row.logo, link, domain: domainOf(row.siteUrl ?? link) };
  } catch (e) {
    if (isMissingTable(e)) return null;
    throw e;
  }
}

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
