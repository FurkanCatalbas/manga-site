// Sonradan eklenen sütunlar için güvenlik önlemi (yalnızca sunucuda).
// Kod, veritabanına SQL'i çalıştırmadan yayınlanırsa site ve build bozulmasın: sütun yoksa sorgular onu atlar.
import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";

export const ALT_TITLES_SQL = `ALTER TABLE "series" ADD COLUMN IF NOT EXISTS "alt_titles" text[] DEFAULT '{}' NOT NULL;`;

/** `series.alt_titles` sütunu var mı? */
export async function hasAltTitles(): Promise<boolean> {
  "use cache";
  cacheTag("series");
  cacheLife("hours");

  const res = await db.execute<{ ok: boolean }>(
    sql`select exists (select 1 from information_schema.columns
      where table_schema = current_schema() and table_name = 'series' and column_name = 'alt_titles') as ok`,
  );
  return Boolean(res.rows[0]?.ok);
}
