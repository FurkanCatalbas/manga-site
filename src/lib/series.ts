// İstemci ve sunucu bileşenlerinin ortak kullandığı tipler ve yardımcılar (veritabanı içermez).

export type SeriesStatus = "Devam Ediyor" | "Tamamlandı";

/** Bölüm listelerinde gereken bilgiler (sayfalar hariç). */
export type ChapterInfo = {
  number: number;
  title: string;
  publishedAt: string; // ISO tarih
};

/** Okuyucudaki bir sayfa. Boyutlar biliniyorsa yer önceden ayrılır, sayfa kaymaz. */
export type Page = { src: string; width?: number; height?: number };

export type Chapter = ChapterInfo & { pages: Page[] };

type SeriesBase = {
  slug: string;
  title: string;
  author: string;
  description: string;
  genres: string[];
  status: SeriesStatus;
  cover: string;
  views: number;
};

/** Liste sayfaları (ana sayfa, arama, popüler) için hafif seri bilgisi. */
export type SeriesSummary = SeriesBase & {
  chapterCount: number;
  firstChapter: number | null;
  latestChapters: ChapterInfo[]; // en yeniden eskiye, en fazla 3
};

/** Seri sayfası için: tüm bölümlerin listesi, eskiden yeniye. */
export type Series = SeriesBase & { chapters: ChapterInfo[] };

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
