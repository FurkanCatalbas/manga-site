// Tarayıcı tarafı hesap istemcisi (Better Auth). Oturum `useSession()` ile okunur; sayfalar statik
// kalır, giriş durumu tarayıcıda öğrenilir.
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { AuthType } from "@/lib/hesap";

export const authClient = createAuthClient({ plugins: [inferAdditionalFields<AuthType>()] });

/** Giriş sonrası dönülecek adres yalnızca sitenin kendi yolu olabilir (açık yönlendirme olmasın). */
export function safeNext(raw: string | null | undefined) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/";
}

/** Better Auth hata kodlarının Türkçesi. */
export function authError(err: { code?: string; message?: string; status?: number } | null | undefined) {
  if (!err) return "Bir hata oluştu, tekrar dene.";
  const map: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: "E-posta ya da şifre yanlış.",
    USER_ALREADY_EXISTS: "Bu e-postayla zaten bir hesap var. Giriş yapmayı dene.",
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Bu e-postayla zaten bir hesap var. Giriş yapmayı dene.",
    EMAIL_NOT_VERIFIED: "Önce e-postana gelen bağlantıyla adresini doğrula.",
    PASSWORD_TOO_SHORT: "Şifre en az 8 karakter olmalı.",
    PASSWORD_TOO_LONG: "Şifre çok uzun.",
    INVALID_EMAIL: "Geçerli bir e-posta adresi yaz.",
    INVALID_TOKEN: "Bağlantının süresi dolmuş ya da geçersiz. Yeniden iste.",
    SESSION_EXPIRED: "Güvenlik için yeniden giriş yapman gerekiyor.",
  };
  if (err.status === 429) return "Çok fazla deneme yaptın, biraz bekle.";
  return (err.code && map[err.code]) || err.message || "Bir hata oluştu, tekrar dene.";
}
