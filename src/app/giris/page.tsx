import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Divider, LoginForm, LoginNotice, SocialButtons } from "@/components/hesap/AuthForms";
import { AuthShell, providersForClient } from "@/components/hesap/AuthShell";

export const metadata: Metadata = { title: "Giriş yap", robots: { index: false }, alternates: { canonical: "/giris" } };

export default function LoginPage() {
  const p = providersForClient();
  return (
    <AuthShell
      title="Giriş yap"
      subtitle="Yorum yap, bölümlere tepki ver, kütüphaneni her cihazda yanında taşı."
      footer={
        <>
          Hesabın yok mu?{" "}
          <Link href="/kayit" className="font-semibold text-fg hover:text-accent">Kayıt ol</Link>
        </>
      }
    >
      <Suspense>
        <LoginNotice />
      </Suspense>
      <SocialButtons providers={p} />
      {p.email && (
        <>
          {(p.google || p.discord) && <Divider />}
          <LoginForm />
        </>
      )}
    </AuthShell>
  );
}
