// Veritabanına örnek serileri ekler. Çalıştırma: npm run db:seed
// Görseller public/sample altında (npm run samples ile üretilir).
import { config } from "dotenv";

config({ path: ".env.local" });

const SAMPLES = [
  {
    slug: "golge-avcisi",
    title: "Gölge Avcısı",
    description:
      "Gece çöktüğünde şehrin gölgeleri canlanır. Genç bir çırak, ustasının bıraktığı eski bir fenerle bu gölgelerin peşine düşer.",
    genres: ["Aksiyon", "Fantastik"],
    status: "Devam Ediyor" as const,
    chapterTitles: ["Fener", "İlk Gece", "Kayıp Usta"],
    firstDate: "2026-09-01",
  },
  {
    slug: "son-istasyon",
    title: "Son İstasyon",
    description:
      "Haritada olmayan bir tren hattının son durağında uyanan yolcular, geri dönmenin tek yolunun birbirlerine güvenmek olduğunu öğrenir.",
    genres: ["Gizem", "Bilim Kurgu"],
    status: "Devam Ediyor" as const,
    chapterTitles: ["Peron", "Bilet", "Makinist", "Tünel"],
    firstDate: "2026-08-20",
  },
  {
    slug: "kiraz-sokagi",
    title: "Kiraz Sokağı",
    description:
      "Küçük bir mahallede açılan kafede, her müşterinin bir hikâyesi vardır. Sıcak, sakin bir gündelik yaşam hikâyesi.",
    genres: ["Gündelik Yaşam", "Romantik"],
    status: "Tamamlandı" as const,
    chapterTitles: ["Açılış", "Yağmurlu Gün"],
    firstDate: "2026-07-15",
  },
];

const PAGES_PER_CHAPTER = 6;
const WEEK = 7 * 24 * 3600 * 1000;

async function main() {
  // db modülü DATABASE_URL'i yükleme anında okuduğu için env'den sonra içe aktarılır
  const { db } = await import("../src/db");
  const { chapters, series } = await import("../src/db/schema");

  for (const s of SAMPLES) {
    const [row] = await db
      .insert(series)
      .values({
        slug: s.slug,
        title: s.title,
        author: "Örnek Yazar",
        description: s.description,
        genres: s.genres,
        status: s.status,
        cover: `/sample/${s.slug}/cover.svg`,
      })
      .onConflictDoNothing({ target: series.slug })
      .returning({ id: series.id });

    if (!row) {
      console.log(`Atlandı (zaten var): ${s.title}`);
      continue;
    }

    const start = new Date(s.firstDate).getTime();
    await db.insert(chapters).values(
      s.chapterTitles.map((title, i) => ({
        seriesId: row.id,
        number: i + 1,
        title,
        publishedAt: new Date(start + i * WEEK),
        pages: Array.from(
          { length: PAGES_PER_CHAPTER },
          (_, p) => `/sample/${s.slug}/${i + 1}/${p + 1}.svg`,
        ),
      })),
    );
    console.log(`Eklendi: ${s.title} (${s.chapterTitles.length} bölüm)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
