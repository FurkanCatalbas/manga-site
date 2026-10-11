// Yönetim paneli oturumu: tek bir yönetici şifresi (ADMIN_PASSWORD).
// Çerezde şifrenin kendisi değil, şifreden türetilen bir HMAC tutulur.
// Şifre değişirse tüm oturumlar otomatik olarak geçersiz olur.
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "webtooku_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 gün

function adminPassword() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || pw.length < 12) {
    throw new Error("ADMIN_PASSWORD tanımlı değil ya da 12 karakterden kısa.");
  }
  return pw;
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function sessionToken() {
  return createHmac("sha256", adminPassword()).update("admin-session-v1").digest("hex");
}

export function checkPassword(input: string) {
  return safeEqual(input, adminPassword());
}

export async function isAdmin() {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return !!value && safeEqual(value, sessionToken());
}

/** Yönetici değilse giriş sayfasına yönlendirir. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/giris");
}
