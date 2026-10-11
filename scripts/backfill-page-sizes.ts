// Sayfa boyutları kayıtlı olmayan eski bölümlerin görsellerini okuyup boyutlarını kaydeder.
// Böylece okuyucu bu bölümlerde de görseller gelmeden sayfa yerlerini ayırır, sayfa kaymaz.
// Görsellere dokunmaz, yalnızca boyutları okur. Çalıştırma: npm run db:backfill-sizes
import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import sharp from "sharp";

config({ path: ".env.local" });

const CONCURRENCY = 6;

async function load(src: string): Promise<Buffer> {
  // Örnek görseller gibi sitenin kendi dosyaları public/ altındadır
  if (src.startsWith("/")) return readFile(path.join("public", src));
  const res = await fetch(src);
  if (!res.ok) throw new Error(`${src}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function size(src: string): Promise<[number, number]> {
  const meta = await sharp(await load(src)).metadata();
  // EXIF yönü varsa tarayıcının gösterdiği boyutlar
  const w = meta.autoOrient?.width ?? meta.width;
  const h = meta.autoOrient?.height ?? meta.height;
  if (!w || !h) throw new Error(`${src}: boyut okunamadı`);
  return [w, h];
}

async function main() {
  // db modülü DATABASE_URL'i yükleme anında okuduğu için env'den sonra içe aktarılır
  const { db } = await import("../src/db");
  const { chapters } = await import("../src/db/schema");
  const { eq, sql } = await import("drizzle-orm");

  const todo = await db
    .select({ id: chapters.id, pages: chapters.pages })
    .from(chapters)
    .where(sql`${chapters.pageSizes} = '[]'::jsonb and cardinality(${chapters.pages}) > 0`);
  console.log(`${todo.length} bölümün sayfa boyutu eksik.`);

  let failed = 0;
  for (const [n, ch] of todo.entries()) {
    try {
      const sizes: [number, number][] = new Array(ch.pages.length);
      let cursor = 0;
      const worker = async () => {
        while (cursor < ch.pages.length) {
          const i = cursor++;
          sizes[i] = await size(ch.pages[i]);
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ch.pages.length) }, worker));
      await db.update(chapters).set({ pageSizes: sizes }).where(eq(chapters.id, ch.id));
      console.log(`[${n + 1}/${todo.length}] bölüm #${ch.id}: ${sizes.length} sayfa`);
    } catch (e) {
      failed++;
      console.error(`[${n + 1}/${todo.length}] bölüm #${ch.id} atlandı: ${(e as Error).message}`);
    }
  }
  console.log(failed ? `Bitti, ${failed} bölüm atlandı (tekrar çalıştırılabilir).` : "Bitti.");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
