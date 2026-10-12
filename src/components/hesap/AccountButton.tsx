"use client";

// Başlığın sağındaki hesap düğmesi: girişliyse fotoğraf (profile gider), değilse "Giriş yap".
// Oturum tarayıcıda öğrenilir; sayfalar statik kalır.
import Link from "next/link";
import { authClient } from "@/lib/hesap-client";
import { Avatar } from "./Avatar";

export function AccountButton() {
  const { data, isPending } = authClient.useSession();
  if (isPending) return <span aria-hidden className="h-9 w-9 shrink-0 rounded-full bg-white/[0.06]" />;
  if (!data) {
    return (
      <Link href="/giris" className="shrink-0 rounded-full bg-fg px-4 py-2 text-sm font-semibold text-bg transition hover:bg-fg/90">
        Giriş yap
      </Link>
    );
  }
  const name = data.user.username || data.user.name;
  return (
    <Link href="/profil" aria-label={`Profil: ${name}`} className="shrink-0 rounded-full transition hover:opacity-90">
      <Avatar name={name} image={data.user.image} size={36} />
    </Link>
  );
}
