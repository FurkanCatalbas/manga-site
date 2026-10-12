import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetForm } from "@/components/hesap/AuthForms";
import { AuthShell } from "@/components/hesap/AuthShell";

export const metadata: Metadata = { title: "Yeni şifre", robots: { index: false } };

export default function ResetPage() {
  return (
    <AuthShell title="Yeni şifre" subtitle="Hesabın için yeni bir şifre belirle.">
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
