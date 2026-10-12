import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const series = pgTable("series", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  // Serinin İngilizce adı (isteğe bağlı); Türkçe ad `title`
  titleEn: text("title_en").notNull().default(""),
  // Diğer adları (Korece, Japonca, romanize…); aramada, seri sayfasında ve SEO'da kullanılır
  altTitles: text("alt_titles").array().notNull().default([]),
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

// --- Hesaplar (Better Auth, src/lib/hesap.ts) ---
// Alan adları Better Auth'un beklediği gibi; tablo adları çoğul (Postgres'te "user" ayrılmış sözcük).

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  // Sitede görünen ad (yorumlarda); kayıtta addan üretilir, profilden değiştirilir
  username: text("username").unique(),
  // Panelden engellenen kullanıcı yorum yazamaz, tepki veremez
  banned: boolean("banned").notNull().default(false),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Topluluk ---

// Seri ve bölüm yorumları. chapter_id boşsa seri sayfasının yorumu. Yanıtlar tek seviye (parent_id).
export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    seriesId: integer("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    chapterId: integer("chapter_id").references(() => chapters.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: integer("parent_id").references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    spoiler: boolean("spoiler").notNull().default(false),
    likes: integer("likes").notNull().default(0),
    // Yanıtı olan yorum silinince kaydı kalır, metni gizlenir ("Bu yorum silindi")
    deleted: boolean("deleted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("comments_scope_idx").on(t.seriesId, t.chapterId, t.createdAt),
    index("comments_user_idx").on(t.userId, t.createdAt),
  ],
);

export const commentLikes = pgTable(
  "comment_likes",
  {
    commentId: integer("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.commentId, t.userId] })],
);

export const commentReports = pgTable(
  "comment_reports",
  {
    id: serial("id").primaryKey(),
    commentId: integer("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.commentId, t.userId)],
);

// Bölüm sonu tepkileri: kullanıcı başına bölümde bir tepki (değiştirilebilir)
export const chapterReactions = pgTable(
  "chapter_reactions",
  {
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.chapterId, t.userId] })],
);

// Herkese açık profil bilgileri. users tablosuna sütun eklenmedi: Better Auth users'ı tüm sütunlarıyla
// okuduğu için yeni sütun SQL'i çalıştırılmadan girişi bozardı; ayrı tablo yoksa yalnızca profil eksik kalır.
export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio").notNull().default(""),
  // Profil kapağında gösterilen en sevilen seri (isteğe bağlı)
  favoriteSeriesId: integer("favorite_series_id").references(() => series.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Seri puanları: kullanıcı başına seride bir puan (1–10)
export const seriesRatings = pgTable(
  "series_ratings",
  {
    seriesId: integer("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.seriesId, t.userId] }), index("series_ratings_user_idx").on(t.userId, t.updatedAt)],
);

// Kullanıcıların öneri listeleri ("En iyi murim serileri" gibi)
export const lists = pgTable(
  "lists",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    isPublic: boolean("is_public").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lists_user_idx").on(t.userId), index("lists_updated_idx").on(t.updatedAt)],
);

export const listItems = pgTable(
  "list_items",
  {
    listId: integer("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    seriesId: integer("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    note: text("note").notNull().default(""),
    position: integer("position").notNull().default(0),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.listId, t.seriesId] })],
);

// Forum: kategoriler kodda sabit (src/lib/forum.ts → FORUM_CATEGORIES), konular ve yanıtlar burada
export const forumTopics = pgTable(
  "forum_topics",
  {
    id: serial("id").primaryKey(),
    category: text("category").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    seriesId: integer("series_id").references(() => series.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    spoiler: boolean("spoiler").notNull().default(false),
    pinned: boolean("pinned").notNull().default(false),
    locked: boolean("locked").notNull().default(false),
    replyCount: integer("reply_count").notNull().default(0),
    lastPostAt: timestamp("last_post_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("forum_topics_cat_idx").on(t.category, t.lastPostAt), index("forum_topics_user_idx").on(t.userId)],
);

export const forumPosts = pgTable(
  "forum_posts",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topic_id")
      .notNull()
      .references(() => forumTopics.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    spoiler: boolean("spoiler").notNull().default(false),
    deleted: boolean("deleted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("forum_posts_topic_idx").on(t.topicId, t.id)],
);

// Forum şikâyetleri: konu (post_id boş) ya da yanıt
export const forumReports = pgTable(
  "forum_reports",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topic_id")
      .notNull()
      .references(() => forumTopics.id, { onDelete: "cascade" }),
    postId: integer("post_id").references(() => forumPosts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

// Canlı sohbet mesajları (tek oda). Eski mesajlar ara sıra temizlenir.
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    deleted: boolean("deleted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("chat_messages_user_idx").on(t.userId, t.createdAt)],
);

export const seriesRelations = relations(series, ({ many }) => ({
  chapters: many(chapters),
}));

export const chaptersRelations = relations(chapters, ({ one }) => ({
  series: one(series, { fields: [chapters.seriesId], references: [series.id] }),
}));
