// Giriş, kayıt ve şifre sayfalarının ortak çerçevesi (ortalanmış kart).
import Link from "next/link";
import { authProviders } from "@/lib/hesap";
import type { Providers } from "./AuthForms";

export function providersForClient(): Providers {
  return {
    google: authProviders.google,
    discord: authProviders.discord,
    email: authProviders.email,
    verify: !!process.env.RESEND_API_KEY,
  };
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <div className="panel p-6 sm:p-8">
        <h1 className="font-display text-3xl tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>}
        <div className="mt-6 grid gap-5">
          {authProviders.enabled ? (
            children
          ) : (
            <p className="rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-muted">
              Hesaplar çok yakında açılıyor. Şimdilik siteyi hesapsız okuyabilirsin.
            </p>
          )}
        </div>
      </div>
      {footer && <p className="mt-6 text-center text-sm text-muted">{footer}</p>}
      <p className="mt-3 text-center text-xs text-muted">
        <Link href="/gizlilik" className="hover:text-fg">Gizlilik ve KVKK</Link>
        {" · "}
        <Link href="/kullanim-kosullari" className="hover:text-fg">Kullanım koşulları</Link>
      </p>
    </div>
  );
}
