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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between border-b border-line pb-3">
        <Link href="/admin" className="text-xl font-bold">
          Yönetim paneli
        </Link>
        <Suspense>
          <LogoutButton />
        </Suspense>
      </div>
      {children}
    </div>
  );
}

async function LogoutButton() {
  if (!(await isAdmin())) return null;
  return (
    <form action={logout}>
      <button className="text-sm font-semibold underline-offset-4 hover:underline">Çıkış yap</button>
    </form>
  );
}
