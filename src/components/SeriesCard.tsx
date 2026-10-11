import Link from "next/link";
import { NewBadge, TimeAgo } from "@/components/TimeAgo";
import type { Series } from "@/lib/series";

/** Kapak ve altında son bölümler: portal ızgarasının ana kartı. */
export function SeriesCard({ series, chapters = 2 }: { series: Series; chapters?: number }) {
  const latest = series.chapters.slice(-chapters).reverse();
  return (
    <article className="group">
      <Link href={`/seri/${series.slug}`} className="relative block overflow-hidden rounded-xl bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- kapaklar CDN'den doğrudan gelecek */}
        <img
          src={series.cover}
          alt=""
          loading="lazy"
          className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
        {series.status === "Tamamlandı" && (
          <span className="absolute top-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-semibold">
            Tamamlandı
          </span>
        )}
      </Link>
      <h3 className="mt-2.5 line-clamp-1 font-semibold">
        <Link href={`/seri/${series.slug}`} className="hover:text-accent">
          {series.title}
        </Link>
      </h3>
      {chapters > 0 && (
        <ul className="mt-1.5 space-y-1">
          {latest.map((c) => (
            <li key={c.number}>
              <Link
                href={`/seri/${series.slug}/bolum/${c.number}`}
                className="flex items-center justify-between gap-2 rounded-md bg-surface px-2 py-1 text-xs hover:bg-surface-2"
              >
                <span className="flex items-center gap-1.5 font-medium">
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
