import type { Metadata } from "next";
import Link from "next/link";
import { Divider, RegisterForm, SocialButtons } from "@/components/hesap/AuthForms";
import { AuthShell, providersForClient } from "@/components/hesap/AuthShell";

export const metadata: Metadata = { title: "Kayıt ol", robots: { index: false }, alternates: { canonical: "/kayit" } };

export default function RegisterPage() {
  const p = providersForClient();
  return (
    <AuthShell
      title="Kayıt ol"
      subtitle="Ücretsiz. Yorumlar, tepkiler ve cihazlar arası kütüphane için."
      footer={
        <>
          Zaten hesabın var mı?{" "}
          <Link href="/giris" className="font-semibold text-fg hover:text-accent">Giriş yap</Link>
        </>
      }
    >
      <SocialButtons providers={p} />
      {p.email && (
        <>
          {(p.google || p.discord) && <Divider />}
          <RegisterForm verify={p.verify} />
        </>
      )}
    </AuthShell>
  );
}
