import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="font-display text-8xl text-gradient">404</p>
      <h1 className="mt-4 text-2xl font-bold">Sayfa bulunamadı</h1>
      <p className="mt-2 text-muted">Seri ya da bölüm kaldırılmış veya adres yanlış yazılmış olabilir.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="btn-primary">
          Ana sayfaya dön
        </Link>
        <Link href="/ara" className="btn-ghost">
          Serilere göz at
        </Link>
      </div>
    </div>
  );
}
