import Link from "next/link";
import { PopularTabs, type PopularItem } from "@/components/PopularTabs";
import { ExclusiveBadge, NewSeriesBadge } from "@/components/Badges";
import { TimeAgo } from "@/components/TimeAgo";
import { genreHref, type Period, type PopularEntry, type SeriesSummary } from "@/lib/data";

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

/**
 * Yeni eklenen seriler. Popüler listesinin altında durduğu için ondan ayrışır: en yenisi geniş bir
 * vitrin kartı, kalanlar küçük kapak ızgarası.
 */
export function NewSeriesList({ series }: { series: SeriesSummary[] }) {
  if (series.length === 0) return null;
  const [first, ...rest] = series;
  return (
    <section className="panel overflow-hidden p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fresh opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-fresh" />
          </span>
          Yeni seriler
        </h2>
        <Link href="/ara?sira=yeni" className="text-xs font-semibold text-muted hover:text-fg">
          Tümü
        </Link>
      </div>

      <Link href={`/seri/${first.slug}`} className="group relative block overflow-hidden rounded-2xl ring-1 ring-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          referrerPolicy="no-referrer"
          src={first.banner || first.cover}
          alt=""
          loading="lazy"
          className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute top-2 left-2 flex gap-1">
          {first.exclusive && <ExclusiveBadge />}
          <NewSeriesBadge addedAt={first.addedAt} />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="line-clamp-1 font-bold transition-colors group-hover:text-accent">{first.title}</p>
          <p className="mt-0.5 text-xs text-fg/70">
            <TimeAgo iso={first.addedAt} /> eklendi
            {first.genres[0] && <> · {first.genres.slice(0, 2).join(" · ")}</>}
          </p>
        </div>
      </Link>

      {rest.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2.5">
          {rest.slice(0, 6).map((s) => (
            <li key={s.slug} className="min-w-0">
              <Link href={`/seri/${s.slug}`} className="group block">
                <span className="relative block overflow-hidden rounded-xl ring-1 ring-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    referrerPolicy="no-referrer"
                    src={s.cover}
                    alt=""
                    loading="lazy"
                    className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {s.exclusive && (
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-r from-accent to-accent-2 py-0.5 text-center text-[9px] font-extrabold tracking-wider text-white uppercase">
                      Orijinal
                    </span>
                  )}
                </span>
                <span className="mt-1.5 block truncate text-xs font-semibold transition-colors group-hover:text-accent">
                  {s.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
