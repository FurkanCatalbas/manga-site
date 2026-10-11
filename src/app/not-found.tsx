import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <div className="tone border-[3px] border-ink bg-white p-8 sm:p-10">
        <p className="riso font-display text-7xl">404</p>
        <p className="balloon mt-6 px-5 py-4">Bu sayfa yok. Seri ya da bölüm kaldırılmış veya adres yanlış yazılmış olabilir.</p>
        <Link
          href="/"
          className="mt-10 inline-block border-[3px] border-ink bg-ink px-5 py-2.5 font-semibold text-paper hover:bg-blue"
        >
          Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}
