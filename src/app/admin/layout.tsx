import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { isAdmin } from "@/lib/auth";
import { logout } from "./actions";

export const metadata: Metadata = {
  title: { default: "Yönetim", template: "%s | Yönetim" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div data-hide-tabbar className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line pb-3">
        <Link href="/admin" className="text-xl font-bold">
          Yönetim paneli
        </Link>
        <Suspense>
          <AdminNav />
        </Suspense>
      </div>
      {children}
    </div>
  );
}

/** Giriş yapılmışsa bölümler arası bağlantılar ve çıkış. */
async function AdminNav() {
  if (!(await isAdmin())) return null;
  return (
    <nav className="flex items-center gap-5 text-sm font-semibold">
      <Link href="/admin" className="underline-offset-4 hover:underline">Seriler</Link>
      <Link href="/admin/turler" className="underline-offset-4 hover:underline">Türler</Link>
      <Link href="/admin/al" className="underline-offset-4 hover:underline">Bölüm al</Link>
      <Link href="/admin/kaynaklar" className="underline-offset-4 hover:underline">Kaynaklar</Link>
      <form action={logout}>
        <button className="text-muted underline-offset-4 hover:text-fg hover:underline">Çıkış yap</button>
      </form>
    </nav>
  );
}
