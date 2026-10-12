import { relations } from "drizzle-orm";
import { boolean, date, integer, jsonb, pgTable, primaryKey, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

export const series = pgTable("series", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  // Serinin İngilizce adı (isteğe bağlı); Türkçe ad `title`
  titleEn: text("title_en").notNull().default(""),
  // "Sadece webtooku" (Orijinal) rozeti: yalnızca bu sitede yayınlanan seriler
  exclusive: boolean("exclusive").notNull().default(false),
  // Ana sayfanın en üstündeki afişlerde gösterilir; banner geniş afiş görseli (boşsa kapaktan üretilir)
  featured: boolean("featured").notNull().default(false),
  banner: text("banner").notNull().default(""),
  description: text("description").notNull(),
  genres: text("genres").array().notNull().default([]),
  status: text("status", { enum: ["Devam Ediyor", "Tamamlandı"] }).notNull(),
  cover: text("cover").notNull(),
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chapters = pgTable(
  "chapters",
  {
    id: serial("id").primaryKey(),
    seriesId: integer("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    // Sayfa görsellerinin URL'leri, okunma sırasıyla
    pages: text("pages").array().notNull().default([]),
    // Sayfaların [genişlik, yükseklik] değerleri, pages ile aynı sırada.
    // Eski bölümlerde boş olabilir; okuyucu o zaman boyutsuz gösterir.
    pageSizes: jsonb("page_sizes").$type<[number, number][]>().notNull().default([]),
  },
  (t) => [unique().on(t.seriesId, t.number)],
);

// Türlerin resmi listesi (panelden yönetilir). Seriler tür adlarını kendi `genres` dizisinde tutar;
// bu tablo seçilebilecek türleri, ad değişikliklerini ve henüz hiçbir seride olmayan türleri taşır.
export const genres = pgTable("genres", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Çeviri kaynakları (fansub ekipleri/siteleri). Seri sayfasında "Bu çeviri X (x.com) üzerinden
// alınmıştır" kutusu olarak görünür. Bir ekipten birden çok seri alınabildiği için ayrı listede tutulur.
export const fansubs = pgTable("fansubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(), // sonradan değişmez (logo R2'de bu adın altında)
  url: text("url"), // ekibin sitesi
  logo: text("logo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Serinin çeviri kaynağı (isteğe bağlı, seri başına en fazla bir). Ayrı tablo: seriler tablosuna sütun
// eklenmediği için bu tablolar veritabanına eklenmeden yayınlansa da site çalışır.
export const seriesFansubs = pgTable("series_fansubs", {
  seriesId: integer("series_id")
    .primaryKey()
    .references(() => series.id, { onDelete: "cascade" }),
  fansubId: integer("fansub_id")
    .notNull()
    .references(() => fansubs.id, { onDelete: "cascade" }),
  url: text("url"), // serinin kaynak sitedeki sayfası; boşsa ekibin sitesine gidilir
});

// Gün gün okunma sayıları (Popüler: günlük / haftalık / aylık ve okunma grafiği için)
export const seriesViewsDaily = pgTable(
  "series_views_daily",
  {
    seriesId: integer("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    day: date("day").notNull(), // İstanbul saatine göre gün
    views: integer("views").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.seriesId, t.day] })],
);

// Okunma sayacının tekrar sayımı engellemesi için: aynı ziyaretçi (IP özeti) aynı bölümü
// aynı gün yalnızca bir kez sayılır. Yalnızca bugün ve dünün kayıtları tutulur.
export const viewHits = pgTable(
  "view_hits",
  {
    visitor: text("visitor").notNull(), // IP'nin gün ile tuzlanmış SHA-256 özeti, IP'nin kendisi saklanmaz
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
  },
  (t) => [primaryKey({ columns: [t.day, t.visitor, t.chapterId] })],
);

export const seriesRelations = relations(series, ({ many }) => ({
  chapters: many(chapters),
}));

export const chaptersRelations = relations(chapters, ({ one }) => ({
  series: one(series, { fields: [chapters.seriesId], references: [series.id] }),
}));
