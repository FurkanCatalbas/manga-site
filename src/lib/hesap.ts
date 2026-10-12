// Kullanıcı hesapları (yalnızca sunucuda): Better Auth, Neon'daki users/sessions/accounts/verifications
// tablolarında. Giriş yolları: Google (GOOGLE_CLIENT_ID/SECRET), e-posta + şifre (RESEND_API_KEY),
// isteğe bağlı Discord (DISCORD_CLIENT_ID/SECRET). BETTER_AUTH_SECRET yoksa hesaplar kapalıdır
// (getAuth null döner, site hesapsız çalışır). Yönetim paneli bundan bağımsızdır (src/lib/auth.ts).
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { and, eq, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { accounts, sessions, users, verifications } from "@/db/schema";
import { emailDelivers, emailEnabled, sendActionEmail } from "@/lib/eposta";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { slugify } from "@/lib/slug";

const env = process.env;
const google = env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET;
const discord = env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET;

/** Giriş sayfasında hangi yolların gösterileceği. */
export const authProviders = {
  enabled: !!env.BETTER_AUTH_SECRET,
  google: !!google,
  discord: !!discord,
  email: emailEnabled,
};

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const PROVIDER_IMAGE_HOSTS = [".googleusercontent.com", "cdn.discordapp.com"];
function isProviderImage(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && PROVIDER_IMAGE_HOSTS.some((h) => (h.startsWith(".") ? u.hostname.endsWith(h) : u.hostname === h));
  } catch {
    return false;
  }
}

/** "Ayşe Yılmaz" → "ayse_yilmaz"; alınmışsa sonuna rakam eklenir. */
async function uniqueUsername(base: string) {
  let name = slugify(base).replace(/-/g, "_").slice(0, 16);
  if (name.length < 3) name = `okur_${name}`.slice(0, 16);
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? name : `${name}_${Math.floor(1000 + Math.random() * 9000)}`;
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, candidate)).limit(1);
    if (!taken) return candidate;
  }
  return `okur_${crypto.randomUUID().slice(0, 8)}`;
}

function createAuth() {
  // www'lu ve www'suz adres aynı site sayılsın
  const origins = [SITE_URL, SITE_URL.replace("://www.", "://"), SITE_URL.replace("://", "://www.")];
  return betterAuth({
    appName: SITE_NAME,
    baseURL: SITE_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [...new Set(origins)],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: users, session: sessions, account: accounts, verification: verifications },
    }),
    user: {
      additionalFields: {
        // Profilden updateUser ile değiştirilir; kurala ve tekilliğe aşağıdaki kanca bakar
        username: { type: "string", required: false, input: true },
        banned: { type: "boolean", required: false, defaultValue: false, input: false },
      },
      deleteUser: { enabled: true },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 60, // 60 gün
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    account: {
      // E-postayla kayıtlı kişi aynı adresli Google hesabıyla da girebilsin
      accountLinking: { enabled: true, trustedProviders: ["google", "discord"] },
    },
    emailAndPassword: {
      enabled: emailEnabled,
      // E-posta gerçekten gidiyorsa adres doğrulanmadan giriş yapılamaz
      requireEmailVerification: emailDelivers,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendActionEmail(
          user.email,
          `${SITE_NAME} şifre sıfırlama`,
          "Şifreni sıfırlamak için aşağıdaki düğmeye dokun. Bağlantı 1 saat geçerli.",
          "Yeni şifre belirle",
          url,
        );
      },
    },
    emailVerification: {
      sendOnSignUp: emailEnabled,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendActionEmail(
          user.email,
          `${SITE_NAME} hesabını doğrula`,
          `Merhaba ${user.name}, ${SITE_NAME} hesabını etkinleştirmek için e-posta adresini doğrula.`,
          "E-postamı doğrula",
          url,
        );
      },
    },
    socialProviders: {
      ...(google && {
        google: { clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET!, prompt: "select_account" as const },
      }),
      ...(discord && { discord: { clientId: env.DISCORD_CLIENT_ID!, clientSecret: env.DISCORD_CLIENT_SECRET! } }),
    },
    databaseHooks: {
      user: {
        create: {
          // Kayıtta gönderilen kullanıcı adı yok sayılır, addan üretilir
          before: async (user) => ({
            data: { ...user, username: await uniqueUsername(user.name || user.email.split("@")[0]) },
          }),
        },
        update: {
          before: async (data, ctx) => {
            // Fotoğraf yalnızca kaldırılabilir; başkasının adresi (ör. ziyaretçi IP'si toplayan görsel) yazılamaz.
            // Google/Discord girişi fotoğrafı kendi alan adlarından getirir.
            if (data.image != null && !isProviderImage(String(data.image))) {
              throw new APIError("BAD_REQUEST", { message: "Profil fotoğrafı değiştirilemez, yalnızca kaldırılabilir." });
            }
            if (data.username === undefined) return;
            const username = String(data.username).trim().toLowerCase();
            if (!USERNAME_PATTERN.test(username)) {
              throw new APIError("BAD_REQUEST", {
                message: "Kullanıcı adı 3–20 karakter olmalı; yalnızca küçük harf, rakam ve alt çizgi.",
              });
            }
            const self = ctx?.context.session?.user.id ?? "";
            const [taken] = await db
              .select({ id: users.id })
              .from(users)
              .where(and(eq(users.username, username), ne(users.id, self)))
              .limit(1);
            if (taken) throw new APIError("BAD_REQUEST", { message: "Bu kullanıcı adı alınmış." });
            return { data: { ...data, username } };
          },
        },
      },
    },
    plugins: [nextCookies()], // server action'larda çerez yazabilmek için (en sonda olmalı)
  });
}

type Auth = ReturnType<typeof createAuth>;
let instance: Auth | null | undefined;

/** Hesaplar açıksa Better Auth örneği, değilse null. */
export function getAuth(): Auth | null {
  if (instance === undefined) instance = authProviders.enabled ? createAuth() : null;
  return instance;
}

export type SessionUser = { id: string; name: string; username: string; image: string | null; banned: boolean };

/** Giriş yapmış kullanıcı (istek çerezinden). cacheComponents gereği <Suspense> içinde ya da action'da çağrılmalı. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const auth = getAuth();
  if (!auth) return null;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & { username?: string | null; banned?: boolean | null };
  return { id: u.id, name: u.name, username: u.username ?? "", image: u.image ?? null, banned: !!u.banned };
}

export type AuthType = Auth;
