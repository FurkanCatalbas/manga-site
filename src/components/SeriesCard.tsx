import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { NewBadge, TimeAgo } from "@/components/TimeAgo";
import type { SeriesSummary } from "@/lib/series";

/** Kapak ve altında son bölümler: portal ızgarasının ana kartı. */
export function SeriesCard({ series, chapters = 2 }: { series: SeriesSummary; chapters?: number }) {
  const latest = series.latestChapters.slice(0, chapters);
  return (
    <article className="group">
      <Link
        href={`/seri/${series.slug}`}
        className="relative block overflow-hidden rounded-2xl bg-surface-2 shadow-lg shadow-black/40 ring-1 ring-white/[0.08] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-black/50 group-hover:ring-white/20"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- kapaklar CDN'den doğrudan gelir */}
        <img
          src={series.cover}
          alt=""
          loading="lazy"
          className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
        />
        {/* Alt kenarda okunabilirlik için hafif karartma */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-2 left-2 flex gap-1.5">
          {series.status === "Tamamlandı" && (
            <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase backdrop-blur-md">
              Tamamlandı
            </span>
          )}
        </div>
        {series.latestChapters[0] && (
          <span className="absolute right-2 bottom-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold backdrop-blur-md">
            {series.chapterCount} bölüm
          </span>
        )}
      </Link>
      <h3 className="mt-3 line-clamp-1 font-semibold">
        <Link href={`/seri/${series.slug}`} className="transition-colors hover:text-accent">
          {series.title}
        </Link>
      </h3>
      {series.titleEn && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{series.titleEn}</p>}
      {chapters > 0 && latest.length > 0 && (
        <ul className="mt-2 space-y-1">
          {latest.map((c) => (
            <li key={c.number}>
              <Link
                href={`/seri/${series.slug}/bolum/${c.number}`}
                className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-xs ring-1 ring-white/[0.04] transition-colors hover:bg-white/[0.07]"
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  Bölüm {c.number}
                  <NewBadge iso={c.publishedAt} />
                </span>
                <TimeAgo iso={c.publishedAt} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/** Bölüm başlığı ve isteğe bağlı "Tümünü gör" bağlantısı. */
export function SectionHeader({ title, href, linkLabel = "Tümünü gör" }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      {href && (
        <Link href={href} className="group flex items-center gap-1 text-sm font-medium text-muted hover:text-fg">
          {linkLabel}
          <ArrowRightIcon size={15} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
