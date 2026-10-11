import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="font-display text-7xl text-accent">404</p>
      <h1 className="mt-4 text-2xl font-bold">Sayfa bulunamadı</h1>
      <p className="mt-2 text-muted">Seri ya da bölüm kaldırılmış veya adres yanlış yazılmış olabilir.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:brightness-110">
          Ana sayfaya dön
        </Link>
        <Link href="/ara" className="rounded-lg bg-surface-2 px-5 py-2.5 font-semibold hover:bg-line">
          Serilere göz at
        </Link>
      </div>
    </div>
  );
}
