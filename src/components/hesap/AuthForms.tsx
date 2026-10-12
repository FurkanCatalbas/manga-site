"use client";

// Giriş, kayıt ve şifre sıfırlama formları. Sayfalar statik; dönülecek adres (?geri=) gönderim anında
// window.location'dan okunur, böylece formlar önceden çizilen HTML'de de yer alır. Adresi render sırasında
// okuyanlar (LoginNotice, ResetForm) <Suspense> içinde kullanılır.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { DiscordLogo, GoogleLogo } from "@/components/icons";
import { authClient, authError, safeNext } from "@/lib/hesap-client";

export type Providers = { google: boolean; discord: boolean; email: boolean; verify: boolean };

const input =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-base placeholder:text-muted focus:border-accent/60 focus:outline-none";
const labelCls = "mb-1.5 block text-sm font-semibold";

const nextUrl = () => safeNext(new URLSearchParams(window.location.search).get("geri"));

function Alert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "ok" }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-sm font-semibold ${tone === "error" ? "bg-accent/10 text-accent" : "bg-fresh/10 text-fresh"}`}
    >
      {children}
    </p>
  );
}

/** Google (ve varsa Discord) ile devam et. */
export function SocialButtons({ providers }: { providers: Providers }) {
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState<string>();

  async function go(provider: "google" | "discord") {
    setPending(provider);
    setError(undefined);
    const { error } = await authClient.signIn.social({ provider, callbackURL: nextUrl(), errorCallbackURL: "/giris?hata=1" });
    if (error) {
      setError(authError(error));
      setPending(undefined);
    }
  }

  if (!providers.google && !providers.discord) return null;
  return (
    <div className="grid gap-2.5">
      {providers.google && (
        <button
          type="button"
          onClick={() => go("google")}
          disabled={!!pending}
          className="flex items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-semibold text-[#1f1f1f] transition hover:bg-white/90 disabled:opacity-60"
        >
          <GoogleLogo />
          {pending === "google" ? "Google'a yönlendiriliyor…" : "Google ile devam et"}
        </button>
      )}
      {providers.discord && (
        <button
          type="button"
          onClick={() => go("discord")}
          disabled={!!pending}
          className="flex items-center justify-center gap-3 rounded-xl bg-[#5865F2] px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          <DiscordLogo />
          {pending === "discord" ? "Discord'a yönlendiriliyor…" : "Discord ile devam et"}
        </button>
      )}
      {error && <Alert>{error}</Alert>}
      <p className="text-center text-xs leading-relaxed text-muted">
        Yalnızca adın, e-postan ve profil fotoğrafın alınır. Hesabında hiçbir şey paylaşılmaz.
      </p>
    </div>
  );
}

export function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold text-muted" aria-hidden>
      <span className="h-px flex-1 bg-white/[0.08]" />
      ya da e-postayla
      <span className="h-px flex-1 bg-white/[0.08]" />
    </div>
  );
}

/** Google'dan hata ile dönülünce (?hata=1) gösterilir. */
export function LoginNotice() {
  return useSearchParams().get("hata") ? <Alert>Giriş yapılamadı, tekrar dene.</Alert> : null;
}

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = nextUrl();
    setPending(true);
    setError(undefined);
    const { error } = await authClient.signIn.email({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      callbackURL: next,
    });
    setPending(false);
    if (error) return setError(authError(error));
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <label htmlFor="email" className={labelCls}>E-posta</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={input} />
      </div>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <label htmlFor="password" className="text-sm font-semibold">Şifre</label>
          <Link href="/sifre" className="text-xs font-semibold text-muted hover:text-fg">
            Şifremi unuttum
          </Link>
        </div>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={input} />
      </div>
      {error && <Alert>{error}</Alert>}
      <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
    </form>
  );
}

export function RegisterForm({ verify }: { verify: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const next = nextUrl();
    setPending(true);
    setError(undefined);
    const { error } = await authClient.signUp.email({
      name: String(fd.get("name")).trim(),
      email,
      password: String(fd.get("password")),
      callbackURL: next,
    });
    setPending(false);
    if (error) return setError(authError(error));
    if (verify) return setSentTo(email);
    router.push(next);
    router.refresh();
  }

  if (sentTo) {
    return (
      <Alert tone="ok">
        Neredeyse bitti! {sentTo} adresine bir doğrulama bağlantısı gönderdik. Bağlantıya dokununca hesabın açılır.
        Gelmediyse gereksiz (spam) klasörüne bak.
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <label htmlFor="name" className={labelCls}>Adın</label>
        <input id="name" name="name" required maxLength={40} autoComplete="nickname" className={input} />
        <p className="mt-1 text-xs text-muted">Yorumlarda görünen kullanıcı adın bundan üretilir, sonra değiştirebilirsin.</p>
      </div>
      <div>
        <label htmlFor="email" className={labelCls}>E-posta</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={input} />
      </div>
      <div>
        <label htmlFor="password" className={labelCls}>Şifre</label>
        <input id="password" name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className={input} />
        <p className="mt-1 text-xs text-muted">En az 8 karakter.</p>
      </div>
      <label className="flex items-start gap-3 text-sm text-fg/80">
        <input type="checkbox" required className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]" />
        <span>
          <Link href="/kullanim-kosullari" className="font-semibold underline underline-offset-2">Kullanım koşullarını</Link>{" "}
          ve{" "}
          <Link href="/gizlilik" className="font-semibold underline underline-offset-2">aydınlatma metnini</Link> okudum, kabul
          ediyorum.
        </span>
      </label>
      {error && <Alert>{error}</Alert>}
      <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
        {pending ? "Hesap açılıyor…" : "Kayıt ol"}
      </button>
    </form>
  );
}

export function ForgotForm() {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const { error } = await authClient.requestPasswordReset({
      email: String(new FormData(e.currentTarget).get("email")),
      redirectTo: "/sifre/yeni",
    });
    setPending(false);
    if (error) return setError(authError(error));
    setDone(true);
  }

  if (done) {
    return (
      <Alert tone="ok">
        Bu adresle bir hesap varsa şifre sıfırlama bağlantısı gönderdik. Gelmediyse gereksiz (spam) klasörüne bak.
      </Alert>
    );
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <label htmlFor="email" className={labelCls}>E-posta</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={input} />
      </div>
      {error && <Alert>{error}</Alert>}
      <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
        {pending ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}
      </button>
    </form>
  );
}

export function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | undefined>(
    params.get("error") || !token ? "Bağlantının süresi dolmuş ya da geçersiz. Yeniden iste." : undefined,
  );

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setPending(true);
    setError(undefined);
    const { error } = await authClient.resetPassword({
      newPassword: String(new FormData(e.currentTarget).get("password")),
      token,
    });
    setPending(false);
    if (error) return setError(authError(error));
    setDone(true);
  }

  if (done) {
    return (
      <div className="grid gap-4">
        <Alert tone="ok">Şifren değişti. Yeni şifrenle giriş yapabilirsin.</Alert>
        <Link href="/giris" className="btn-primary">Giriş yap</Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <div>
        <label htmlFor="password" className={labelCls}>Yeni şifre</label>
        <input id="password" name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className={input} />
      </div>
      {error && <Alert>{error}</Alert>}
      {error && !token ? (
        <Link href="/sifre" className="btn-ghost">Yeni bağlantı iste</Link>
      ) : (
        <button type="submit" disabled={pending || !token} className="btn-primary disabled:opacity-60">
          {pending ? "Kaydediliyor…" : "Şifremi değiştir"}
        </button>
      )}
    </form>
  );
}
