"use server";

import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { chapters, series } from "@/db/schema";
import { checkPassword, requireAdmin, SESSION_COOKIE, SESSION_MAX_AGE, sessionToken } from "@/lib/auth";
import { deletePrefix } from "@/lib/r2";
import { SLUG_PATTERN } from "@/lib/slug";

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
};

function validateSeries(input: SeriesInput): string | undefined {
  if (!input.title.trim()) return "Seri adı boş olamaz.";
  if (!SLUG_PATTERN.test(input.slug)) return "Adres yalnızca küçük harf, rakam ve tire içerebilir.";
  if (!input.cover) return "Kapak görseli yükle.";
  if (!["Devam Ediyor", "Tamamlandı"].includes(input.status)) return "Geçersiz durum.";
}

export async function createSeries(input: SeriesInput): Promise<FormState> {
  await requireAdmin();
  const error = validateSeries(input);
  if (error) return { error };

  const [row] = await db
    .insert(series)
    .values({ ...input, title: input.title.trim(), author: input.author.trim() })
    .onConflictDoNothing({ target: series.slug })
    .returning({ id: series.id });
  if (!row) return { error: `"${input.slug}" adresi başka bir seride kullanılıyor.` };

  updateTag("series");
  redirect(`/admin/seri/${input.slug}`);
}

export async function updateSeries(input: SeriesInput): Promise<FormState> {
  await requireAdmin();
  const error = validateSeries(input);
  if (error) return { error };

  const { slug, ...rest } = input;
  await db
    .update(series)
    .set({ ...rest, title: rest.title.trim(), author: rest.author.trim() })
    .where(eq(series.slug, slug));
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

export type ChapterInput = { slug: string; number: number; title: string; pages: string[] };

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
