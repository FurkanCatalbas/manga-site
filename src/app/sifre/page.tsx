import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/hesap/AuthForms";
import { AuthShell } from "@/components/hesap/AuthShell";

export const metadata: Metadata = { title: "Şifremi unuttum", robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthShell
      title="Şifremi unuttum"
      subtitle="Kayıt olduğun e-postayı yaz, şifreni sıfırlaman için bir bağlantı gönderelim."
      footer={<Link href="/giris" className="font-semibold text-fg hover:text-accent">Girişe dön</Link>}
    >
      <ForgotForm />
    </AuthShell>
  );
}
