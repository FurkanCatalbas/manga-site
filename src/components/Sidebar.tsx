import Link from "next/link";
import { PopularTabs, type PopularItem } from "@/components/PopularTabs";
import type { Period, PopularEntry } from "@/lib/data";

/** Popüler verisini istemciye sadece gereken alanlarla aktarır. */
export function PopularList({ data }: { data: Record<Period, PopularEntry[]> }) {
  const slim = Object.fromEntries(
    Object.entries(data).map(([period, entries]) => [
      period,
      entries.map(({ series: s, views, trend }) => ({
        slug: s.slug,
        title: s.title,
        cover: s.cover,
        genres: s.genres,
        views,
        trend,
      })),
    ]),
  ) as Record<Period, PopularItem[]>;
  return <PopularTabs data={slim} />;
}

export function GenreList({ genres }: { genres: string[] }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-lg font-bold">Türler</h2>
      <div className="flex flex-wrap gap-2">
        {genres.map((g) => (
          <Link
            key={g}
            href={`/ara?tur=${encodeURIComponent(g)}`}
            className="rounded-full border border-line bg-surface-2 px-3 py-1 text-sm hover:border-accent hover:text-accent"
          >
            {g}
          </Link>
        ))}
      </div>
    </section>
  );
}
