// Yönetim panelinin tür listesi sorguları (yalnızca sunucuda).
// Sitenin herkese açık tarafı türleri serilerden türetir (data.ts → getAllGenres); bu tabloya bağlı değildir,
// böylece tablo veritabanına eklenmeden yayınlansa da site çalışmaya devam eder.
import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { genres, series } from "@/db/schema";
import { cleanGenreName } from "@/lib/series";
import { slugify } from "@/lib/slug";

export { cleanGenreName };

export type GenreRow = { id: number; name: string; slug: string; count: number };

/** `genres` tablosu veritabanında henüz yoksa (db:push yapılmamışsa) Postgres 42P01 döner. */
export function isMissingTable(e: unknown) {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "42P01" || err?.cause?.code === "42P01";
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "tr");

/** Tüm türler ve her birini kullanan seri sayısı. Tablo yoksa null. */
export async function getGenreList(): Promise<GenreRow[] | null> {
  try {
    const rows = await db
      .select({
        id: genres.id,
        name: genres.name,
        slug: genres.slug,
        count: sql<number>`(select count(*) from ${series} where ${genres.name} = any(${series.genres}))::int`,
      })
      .from(genres)
      .orderBy(asc(genres.name));
    return rows.sort(byName);
  } catch (e) {
    if (isMissingTable(e)) return null;
    throw e;
  }
}

/** Serilerde kullanılan ama listede olmayan türler (ör. tablo yeni eklendiyse eski türler). */
export async function getUnlistedGenres(): Promise<{ name: string; count: number }[]> {
  try {
    const rows = await db.execute<{ name: string; count: number }>(sql`
      select g as name, count(*)::int as count
      from ${series}, unnest(${series.genres}) as g
      where not exists (select 1 from ${genres} where ${genres.name} = g)
      group by g
    `);
    return [...rows.rows].sort(byName);
  } catch (e) {
    if (isMissingTable(e)) return [];
    throw e;
  }
}

/** Verilen türleri listeye ekler (zaten varsa dokunmaz). Tablo yoksa sessizce geçer. */
export async function ensureGenres(names: string[]) {
  const values = [...new Set(names.map(cleanGenreName).filter(Boolean))]
    .map((name) => ({ name, slug: slugify(name) }))
    .filter((g) => g.slug);
  if (values.length === 0) return;
  try {
    await db.insert(genres).values(values).onConflictDoNothing();
  } catch (e) {
    if (!isMissingTable(e)) throw e;
  }
}
