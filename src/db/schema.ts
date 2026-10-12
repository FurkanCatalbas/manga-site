import { relations } from "drizzle-orm";
import { date, integer, jsonb, pgTable, primaryKey, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

export const series = pgTable("series", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  author: text("author").notNull(),
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
