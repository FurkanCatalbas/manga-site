// Bölüm sayfasının altı: seri bilgisi, paylaş ve son bölümler. Sayfa yalnızca görsellerden oluşmasın,
// arama motorları bölümün hangi seriye ait olduğunu metinden de anlasın diye.
import Link from "next/link";
import { ShareButton } from "@/components/ShareButton";
import { TimeAgo } from "@/components/TimeAgo";
import { genreHref, type Series } from "@/lib/series";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

// Bölümün önünde ve arkasında listelenen bölüm sayısı: her bölüm komşularından bağlantı alır,
// arama motorları seri sayfasına uğramadan da tüm bölümlere ulaşır
const AROUND = 5;

const dateFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });

export function ChapterAbout({ series, chapter, pageCount }: { series: Series; chapter: number; pageCount: number }) {
  const seriesHref = `/seri/${series.slug}`;
  const names = [series.titleAlt, ...series.altTitles].filter(Boolean);
  const idx = series.chapters.findIndex((c) => c.number === chapter);
  const current = series.chapters[idx];
  const prev = series.chapters[idx - 1];
  const next = series.chapters[idx + 1];
  const last = series.chapters.at(-1);
  const nearby = series.chapters.slice(Math.max(0, idx - AROUND), idx + AROUND + 1).reverse();
  if (last && !nearby.includes(last)) nearby.unshift(last);
  const chapterHref = (n: number) => `${seriesHref}/bolum/${n}`;

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

      <h2 className="mt-8 mb-3 text-lg font-bold">{series.title} bölümleri</h2>
      <ol className="grid gap-2">
        {nearby.map((c) => (
          <li key={c.number}>
            <Link
              href={chapterHref(c.number)}
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

      {/* Her bölümde farklı metin: sayfalar yalnızca görselden ve ortak kalıptan oluşup birbirinin kopyası sayılmasın */}
      <p className="mt-6 text-xs leading-relaxed text-muted">
        {series.title} {chapter}. bölüm
        {current && current.title.toLocaleLowerCase("tr") !== `${chapter}. bölüm` && <> (&quot;{current.title}&quot;)</>}
        , {pageCount} sayfa olarak
        {current && <> {dateFormat.format(new Date(current.publishedAt))} tarihinde</>} {SITE_NAME}&apos;ya eklendi.
        {" "}Seride şu an {series.chapters.length} bölüm var.
        {prev && (
          <>
            {" "}Önceki bölüm: <Link href={chapterHref(prev.number)} className="underline underline-offset-2 hover:text-accent">{series.title} {prev.number}. bölüm</Link>.
          </>
        )}
        {next && (
          <>
            {" "}Sonraki bölüm: <Link href={chapterHref(next.number)} className="underline underline-offset-2 hover:text-accent">{series.title} {next.number}. bölüm</Link>.
          </>
        )}
        {" "}{series.title} Türkçe tüm bölümleriyle reklamsız, üyeliksiz ve ücretsiz okunur.
      </p>
    </section>
  );
}
