// Bölüm ekleme: panel (server action) ve dışarıdan yayın API'si (/api/admin/bolum) ortak kullanır.
// Yetki kontrolü ve önbellek yenileme çağıranın işidir.
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, series } from "@/db/schema";

export type ChapterInput = {
  slug: string;
  number: number;
  title: string;
  pages: string[];
  pageSizes: [number, number][]; // pages ile aynı sırada [genişlik, yükseklik]
};

/** Görsel adresi: R2 ya da başka sitedeki https bağlantısı; örnek veriler için sitedeki yol. */
export function isImageSrc(v: unknown) {
  if (typeof v !== "string") return false;
  if (v.startsWith("/") && !v.startsWith("//")) return true;
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}

const isSize = (v: unknown) =>
  Array.isArray(v) && v.length === 2 && v.every((n) => Number.isInteger(n) && n > 0);

/** Doğrulayıp bölümü ekler. `conflict`: aynı numaralı bölüm zaten var. */
export async function insertChapter(
  input: ChapterInput,
): Promise<{ ok: string } | { error: string; conflict?: true }> {
  if (!Number.isInteger(input.number) || input.number < 0) return { error: "Bölüm numarası 0 veya daha büyük olmalı." };
  if (!Array.isArray(input.pages) || input.pages.length === 0) return { error: "En az bir sayfa yükle." };
  if (!input.pages.every(isImageSrc)) return { error: "Sayfa bağlantıları https:// ile başlamalı." };

  const s = await db.query.series.findFirst({ columns: { id: true }, where: eq(series.slug, String(input.slug)) });
  if (!s) return { error: "Seri bulunamadı." };

  const [row] = await db
    .insert(chapters)
    .values({
      seriesId: s.id,
      number: input.number,
      title: String(input.title ?? "").trim() || `${input.number}. bölüm`,
      pages: input.pages,
      // Boyutlar eksik ya da bozuksa hiç kaydetme; okuyucu boyutsuz da çalışır
      pageSizes:
        input.pageSizes?.length === input.pages.length && input.pageSizes.every(isSize) ? input.pageSizes : [],
    })
    .onConflictDoNothing()
    .returning({ id: chapters.id });
  if (!row) return { error: `${input.number}. bölüm zaten var. Önce eskisini sil.`, conflict: true };
  return { ok: `${input.number}. bölüm yayınlandı.` };
}
