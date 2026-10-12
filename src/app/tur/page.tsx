import type { Metadata } from "next";
import Link from "next/link";
import { getGenres, getSeriesList } from "@/lib/data";
import { slugify } from "@/lib/slug";

export const metadata: Metadata = {
  title: "Türler",
  description: "Aksiyon, fantezi, romantizm ve daha fazlası: webtoon ve manga serilerini türe göre keşfet.",
  alternates: { canonical: "/tur" },
};

export default async function GenresPage() {
  const [genres, series] = await Promise.all([getGenres(), getSeriesList()]);
  // Her türün kutusunda o türün en çok okunan serisinin kapağı
  const coverOf = (slug: string) =>
    series.filter((s) => s.genres.some((g) => slugify(g) === slug)).sort((a, b) => b.views - a.views)[0]?.cover;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Türler</h1>
      <p className="mt-1 text-muted">{genres.length} tür</p>

      {genres.length === 0 ? (
        <p className="panel mt-6 p-6 text-muted">Henüz tür eklenmedi.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {genres.map((g) => {
            const cover = coverOf(g.slug);
            return (
              <li key={g.slug}>
                <Link
                  href={`/tur/${g.slug}`}
                  className="group relative flex h-24 flex-col justify-end overflow-hidden rounded-2xl bg-surface-2 p-4 ring-1 ring-white/[0.08] transition hover:ring-white/20 sm:h-28"
                >
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      referrerPolicy="no-referrer"
                      src={cover}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover opacity-35 transition duration-500 group-hover:scale-105 group-hover:opacity-50"
                    />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
                  <span className="relative truncate text-lg font-bold tracking-tight">{g.name}</span>
                  <span className="relative text-xs text-muted">{g.count} seri</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
