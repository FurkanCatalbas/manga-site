import Link from "next/link";
import { PopularTabs, type PopularItem } from "@/components/PopularTabs";
import { genreHref, type Period, type PopularEntry } from "@/lib/data";

/** Popüler verisini istemciye sadece gereken alanlarla aktarır. */
export function PopularList({ data }: { data: Record<Period, PopularEntry[]> }) {
  const slim = Object.fromEntries(
    Object.entries(data).map(([period, entries]) => [
      period,
      entries.map(({ series: s, views }) => ({
        slug: s.slug,
        title: s.title,
        cover: s.cover,
        genres: s.genres,
        views,
      })),
    ]),
  ) as Record<Period, PopularItem[]>;
  return <PopularTabs data={slim} />;
}

export function GenreList({ genres }: { genres: string[] }) {
  return (
    <section className="panel p-4 sm:p-5">
      <h2 className="mb-3 text-lg font-bold">Türler</h2>
      <div className="flex flex-wrap gap-2">
        {genres.map((g) => (
          <Link
            key={g}
            href={genreHref(g)}
            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm transition-colors hover:border-accent/50 hover:text-accent"
          >
            {g}
          </Link>
        ))}
      </div>
    </section>
  );
}
