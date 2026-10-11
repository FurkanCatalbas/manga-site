// İstemci ve sunucu bileşenlerinin ortak kullandığı tipler ve yardımcılar (veritabanı içermez).

export type SeriesStatus = "Devam Ediyor" | "Tamamlandı";

export type Chapter = {
  number: number;
  title: string;
  publishedAt: string; // ISO tarih
  pages: string[]; // görsel URL'leri, sırayla
};

export type Series = {
  slug: string;
  title: string;
  author: string;
  description: string;
  genres: string[];
  status: SeriesStatus;
  cover: string;
  views: number;
  chapters: Chapter[];
};

export function latestChapter(series: Series): Chapter | undefined {
  return series.chapters.at(-1);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
