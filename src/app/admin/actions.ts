"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { chapters, fansubs, genres, series } from "@/db/schema";
import { checkPassword, requireAdmin, SESSION_COOKIE, SESSION_MAX_AGE, sessionToken } from "@/lib/auth";
import { cleanUrl, setSeriesFansub } from "@/lib/fansubs";
import { cleanGenreName, ensureGenres, isMissingTable } from "@/lib/genres";
import { deletePrefix } from "@/lib/r2";
import { SLUG_PATTERN, slugify } from "@/lib/slug";

export type FormState = { error?: string; ok?: string } | undefined;

// --- Oturum ---

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    // Kaba kuvvet denemelerini yavaşlat
    await new Promise((r) => setTimeout(r, 1000));
    return { error: "Şifre yanlış." };
  }
  (await cookies()).set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/giris");
}

// --- Seriler ---

export type SeriesInput = {
  slug: string;
  title: string;
  author: string;
  description: string;
  genres: string[];
  status: "Devam Ediyor" | "Tamamlandı";
  cover: string;
  /** Çeviri kaynağı (isteğe bağlı): kaynak listesinden seçilen ekip ve serinin o sitedeki adresi */
  source?: { fansubId: number | null; url: string };
};

/** Formdaki kaynağı doğrular: seçili ekip (yoksa null) ve temizlenmiş seri adresi. */
function parseSource(source: SeriesInput["source"]) {
  if (!source) return undefined;
  const fansubId = Number.isInteger(source.fansubId) && source.fansubId! > 0 ? source.fansubId : null;
  const cleaned = cleanUrl(fansubId ? source.url : "");
  if ("error" in cleaned) return { error: `Kaynak adresi: ${cleaned.error}` };
  return { fansubId, url: cleaned.url };
}

/** Türleri temizler, tekrarları atar (sıra korunur). */
function normalizeGenres(list: string[]) {
  return [...new Set(list.map(cleanGenreName).filter(Boolean))];
}

function validateSeries(input: SeriesInput): string | undefined {
  if (!input.title.trim()) return "Seri adı boş olamaz.";
  if (!SLUG_PATTERN.test(input.slug)) return "Adres yalnızca küçük harf, rakam ve tire içerebilir.";
  if (!input.cover) return "Kapak görseli yükle.";
  if (!["Devam Ediyor", "Tamamlandı"].includes(input.status)) return "Geçersiz durum.";
  if (input.genres.some((g) => g.length > GENRE_MAX)) return `Tür adı en fazla ${GENRE_MAX} karakter olabilir.`;
  const source = parseSource(input.source);
  if (source && "error" in source) return source.error;
}

export async function createSeries(input: SeriesInput): Promise<FormState> {
  await requireAdmin();
  input = { ...input, genres: normalizeGenres(input.genres) };
  const error = validateSeries(input);
  if (error) return { error };

  const { source, ...values } = input;
  const [row] = await db
    .insert(series)
    .values({ ...values, title: values.title.trim(), author: values.author.trim() })
    .onConflictDoNothing({ target: series.slug })
    .returning({ id: series.id });
  if (!row) return { error: `"${input.slug}" adresi başka bir seride kullanılıyor.` };
  await ensureGenres(input.genres);
  const parsed = parseSource(source);
  if (parsed && !("error" in parsed)) await setSeriesFansub(row.id, parsed.fansubId, parsed.url);

  updateTag("series");
  redirect(`/admin/seri/${input.slug}`);
}

export async function updateSeries(input: SeriesInput): Promise<FormState> {
  await requireAdmin();
  input = { ...input, genres: normalizeGenres(input.genres) };
  const error = validateSeries(input);
  if (error) return { error };

  const { slug, source, ...rest } = input;
  const [row] = await db
    .update(series)
    .set({ ...rest, title: rest.title.trim(), author: rest.author.trim() })
    .where(eq(series.slug, slug))
    .returning({ id: series.id });
  if (!row) return { error: "Seri bulunamadı." };
  await ensureGenres(input.genres);
  const parsed = parseSource(source);
  if (parsed && !("error" in parsed)) await setSeriesFansub(row.id, parsed.fansubId, parsed.url);
  updateTag("series");
  return { ok: "Kaydedildi." };
}

export async function deleteSeries(slug: string) {
  await requireAdmin();
  await db.delete(series).where(eq(series.slug, slug)); // bölümler cascade ile silinir
  await deletePrefix(`series/${slug}/`);
  updateTag("series");
  redirect("/admin");
}

// --- Bölümler ---

export type ChapterInput = {
  slug: string;
  number: number;
  title: string;
  pages: string[];
  pageSizes: [number, number][]; // pages ile aynı sırada [genişlik, yükseklik]
};

const isSize = (v: unknown) =>
  Array.isArray(v) && v.length === 2 && v.every((n) => Number.isInteger(n) && n > 0);

export async function createChapter(input: ChapterInput): Promise<FormState> {
  await requireAdmin();
  if (!Number.isInteger(input.number) || input.number < 1) return { error: "Bölüm numarası 1 veya daha büyük olmalı." };
  if (input.pages.length === 0) return { error: "En az bir sayfa yükle." };

  const s = await db.query.series.findFirst({ where: eq(series.slug, input.slug) });
  if (!s) return { error: "Seri bulunamadı." };

  const [row] = await db
    .insert(chapters)
    .values({
      seriesId: s.id,
      number: input.number,
      title: input.title.trim() || `${input.number}. bölüm`,
      pages: input.pages,
      // Boyutlar eksik ya da bozuksa hiç kaydetme; okuyucu boyutsuz da çalışır
      pageSizes:
        input.pageSizes?.length === input.pages.length && input.pageSizes.every(isSize) ? input.pageSizes : [],
    })
    .onConflictDoNothing()
    .returning({ id: chapters.id });
  if (!row) return { error: `${input.number}. bölüm zaten var. Önce eskisini sil.` };

  updateTag("series");
  return { ok: `${input.number}. bölüm yayınlandı.` };
}

export async function deleteChapter(slug: string, number: number) {
  await requireAdmin();
  const s = await db.query.series.findFirst({ where: eq(series.slug, slug) });
  if (!s) return;
  await db.delete(chapters).where(and(eq(chapters.seriesId, s.id), eq(chapters.number, number)));
  await deletePrefix(`series/${slug}/${number}/`);
  updateTag("series");
}

// --- Türler ---

const GENRE_MAX = 40;

const MISSING_TABLE_ERROR = "Türler tablosu veritabanında yok. Türler sayfasındaki SQL'i çalıştır.";

function validateGenreName(raw: string): { name: string; slug: string } | { error: string } {
  const name = cleanGenreName(raw);
  if (!name) return { error: "Tür adı boş olamaz." };
  if (name.length > GENRE_MAX) return { error: `Tür adı en fazla ${GENRE_MAX} karakter olabilir.` };
  const slug = slugify(name);
  if (!slug) return { error: "Tür adında en az bir harf ya da rakam olmalı." };
  return { name, slug };
}

/** Postgres benzersizlik ihlali: aynı ad ya da adres başka bir türde var. */
const isDuplicate = (e: unknown) => {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
};

export async function createGenre(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const v = validateGenreName(String(formData.get("name") ?? ""));
  if ("error" in v) return v;
  try {
    const [row] = await db.insert(genres).values(v).onConflictDoNothing().returning({ id: genres.id });
    if (!row) return { error: `"${v.name}" zaten listede.` };
  } catch (e) {
    if (isMissingTable(e)) return { error: MISSING_TABLE_ERROR };
    throw e;
  }
  refresh();
  return { ok: `"${v.name}" eklendi.` };
}

/** Türün adını değiştirir; o türü kullanan tüm serilerde de değişir. */
export async function renameGenre(id: number, _: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const v = validateGenreName(String(formData.get("name") ?? ""));
  if ("error" in v) return v;

  const [old] = await db.select({ name: genres.name }).from(genres).where(eq(genres.id, id));
  if (!old) return { error: "Tür bulunamadı." };
  if (old.name === v.name) return { ok: "Değişiklik yok." };

  try {
    // Tek ifadede: türün adını ve onu kullanan serilerdeki adı birlikte değiştir.
    // Seride yeni ad zaten varsa tekrar etmesin diye dizi sırası korunarak tekilleştirilir.
    await db.execute(sql`
      with renamed as (
        update ${genres} set name = ${v.name}, slug = ${v.slug} where id = ${id} returning id
      )
      update ${series} set genres = array(
        select g from unnest(array_replace(${series.genres}, ${old.name}, ${v.name})) with ordinality as t(g, i)
        group by g order by min(i)
      )
      where ${old.name} = any(${series.genres}) and exists (select 1 from renamed)
    `);
  } catch (e) {
    if (isDuplicate(e)) return { error: `"${v.name}" adında ya da adresinde başka bir tür var.` };
    throw e;
  }
  updateTag("series");
  refresh();
  return { ok: "Kaydedildi." };
}

/** Türü listeden siler ve tüm serilerden kaldırır. */
export async function deleteGenre(id: number) {
  await requireAdmin();
  await db.execute(sql`
    with removed as (delete from ${genres} where id = ${id} returning name)
    update ${series} set genres = array_remove(${series.genres}, (select name from removed))
    where (select name from removed) = any(${series.genres})
  `);
  updateTag("series");
  refresh();
}

/** Serilerde kullanılıp listede olmayan türleri listeye ekler. */
export async function addUnlistedGenres(names: string[]) {
  await requireAdmin();
  await ensureGenres(names.filter((n) => n.length <= GENRE_MAX));
  refresh();
}

// --- Çeviri kaynakları ---

const MISSING_SOURCE_TABLE = "Kaynak tabloları veritabanında yok. Kaynaklar sayfasındaki SQL'i çalıştır.";

/** Kaynak formu: ad, site adresi, logo (panelde önceden R2'ye yüklenmiş adres). */
function parseFansubForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim();
  if (!name) return { error: "Kaynak adı boş olamaz." };
  if (name.length > 60) return { error: "Kaynak adı en fazla 60 karakter olabilir." };
  const site = cleanUrl(String(formData.get("url") ?? ""));
  if ("error" in site) return { error: `Site adresi: ${site.error}` };
  const logo = String(formData.get("logo") ?? "").trim() || null;
  if (logo && !/^https:\/\//.test(logo)) return { error: "Logo adresi geçersiz." };
  return { name, url: site.url, logo };
}

export async function createFansub(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const v = parseFansubForm(formData);
  if ("error" in v) return v;
  const slug = slugify(v.name);
  if (!slug) return { error: "Kaynak adında en az bir harf ya da rakam olmalı." };
  try {
    const [row] = await db
      .insert(fansubs)
      .values({ ...v, slug })
      .onConflictDoNothing()
      .returning({ id: fansubs.id });
    if (!row) return { error: `"${v.name}" zaten listede.` };
  } catch (e) {
    if (isMissingTable(e)) return { error: MISSING_SOURCE_TABLE };
    throw e;
  }
  refresh();
  return { ok: `"${v.name}" eklendi.` };
}

export async function updateFansub(id: number, _: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const v = parseFansubForm(formData);
  if ("error" in v) return v;
  try {
    await db.update(fansubs).set(v).where(eq(fansubs.id, id));
  } catch (e) {
    if (isDuplicate(e)) return { error: `"${v.name}" adında başka bir kaynak var.` };
    throw e;
  }
  updateTag("series");
  refresh();
  return { ok: "Kaydedildi." };
}

/** Kaynağı siler; bağlı serilerden kutu kalkar (cascade), logosu R2'den silinir. */
export async function deleteFansub(id: number) {
  await requireAdmin();
  const [row] = await db.delete(fansubs).where(eq(fansubs.id, id)).returning({ slug: fansubs.slug });
  updateTag("series");
  refresh();
  // Logo temizliği ikincil: R2'ye ulaşılamazsa kayıt yine silinmiş olur, artık dosya zararsızdır
  if (row) {
    try {
      await deletePrefix(`fansubs/${row.slug}/`);
    } catch (e) {
      console.error("Kaynak logosu R2'den silinemedi:", e);
    }
  }
}
