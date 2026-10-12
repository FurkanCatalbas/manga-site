// Bölüm sayfasının altı: seri bilgisi, paylaş ve son bölümler. Sayfa yalnızca görsellerden oluşmasın,
// arama motorları bölümün hangi seriye ait olduğunu metinden de anlasın diye.
import Link from "next/link";
import { ShareButton } from "@/components/ShareButton";
import { TimeAgo } from "@/components/TimeAgo";
import { genreHref, type Series } from "@/lib/series";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

const LATEST = 6;

export function ChapterAbout({ series, chapter }: { series: Series; chapter: number }) {
  const seriesHref = `/seri/${series.slug}`;
  const names = [series.titleAlt, ...series.altTitles].filter(Boolean);
  const latest = series.chapters.slice(-LATEST).reverse();

  return (
    <section aria-label="Seri hakkında" className="mx-auto max-w-3xl px-4 pb-12">
      <div className="panel p-4 sm:p-5">
        <div className="flex gap-4">
          <Link href={seriesHref} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              referrerPolicy="no-referrer"
              src={series.cover}
              alt={`${series.title} kapağı`}
              loading="lazy"
              className="w-20 rounded-xl object-cover ring-1 ring-white/10 sm:w-24"
            />
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted">Okuduğun seri</p>
            <h2 className="mt-0.5 text-lg leading-snug font-bold tracking-tight">
              <Link href={seriesHref} className="hover:text-accent">
                {series.title}
              </Link>
            </h2>
            {names.length > 0 && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{names.join(" · ")}</p>}
            {series.genres.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {series.genres.slice(0, 4).map((g) => (
                  <Link
                    key={g}
                    href={genreHref(g)}
                    className="rounded-full border border-white/[0.08] px-2.5 py-0.5 text-xs text-fg/80 hover:border-accent/50 hover:text-accent"
                  >
                    {g}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-fg/75">{series.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ShareButton
            url={absoluteUrl(`${seriesHref}/bolum/${chapter}`)}
            title={`${series.title} ${chapter}. bölüm Türkçe oku`}
            className="px-4 py-2 text-sm"
          />
          <Link href={seriesHref} className="btn-ghost px-4 py-2 text-sm">
            Tüm bölümler ({series.chapters.length})
          </Link>
        </div>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-bold">Son bölümler</h2>
      <ol className="grid gap-2">
        {latest.map((c) => (
          <li key={c.number}>
            <Link
              href={`${seriesHref}/bolum/${c.number}`}
              aria-current={c.number === chapter ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 ring-1 transition-colors ${
                c.number === chapter
                  ? "bg-accent/10 ring-accent/40"
                  : "bg-white/[0.03] ring-white/[0.06] hover:bg-white/[0.06]"
              }`}
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                <span className="font-semibold">{c.number}. bölüm</span>
                {/* Başlıksız bölümlerin adı zaten "12. bölüm" */}
                {c.title && c.title.toLocaleLowerCase("tr") !== `${c.number}. bölüm` && (
                  <span className="text-muted"> · {c.title}</span>
                )}
              </span>
              <TimeAgo iso={c.publishedAt} className="shrink-0 text-xs text-muted" />
            </Link>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        {series.title} {chapter}. bölümü {SITE_NAME}&apos;da Türkçe okuyorsun. Serinin tüm bölümleri
        reklamsız, üyeliksiz ve ücretsiz; yeni bölümler eklendikçe burada.
      </p>
    </section>
  );
}
