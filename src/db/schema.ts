import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

export const series = pgTable("series", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  description: text("description").notNull(),
  genres: text("genres").array().notNull().default([]),
  status: text("status", { enum: ["Devam Ediyor", "Tamamlandı"] }).notNull(),
  cover: text("cover").notNull(),
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
  },
  (t) => [unique().on(t.seriesId, t.number)],
);

export const seriesRelations = relations(series, ({ many }) => ({
  chapters: many(chapters),
}));

export const chaptersRelations = relations(chapters, ({ one }) => ({
  series: one(series, { fields: [chapters.seriesId], references: [series.id] }),
}));
