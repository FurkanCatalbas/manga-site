import Link from "next/link";
import { SeriesCard } from "@/components/SeriesCard";
import { formatDate, getAllSeries, getRecentlyUpdated, latestChapter } from "@/lib/data";

export default async function Home() {
  const [recent, all] = await Promise.all([getRecentlyUpdated(), getAllSeries()]);
  const featured = recent[0];
  const featuredLatest = featured && latestChapter(featured);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      {featured && (
        // Giriş: bir manga sayfası gibi panellere bölünmüş öne çıkan seri
        <section aria-label="Öne çıkan seri" className="grid gap-3 md:grid-cols-12 md:grid-rows-[auto_auto]">
          <div className="tone border-[3px] border-ink bg-white p-6 md:col-span-8 md:p-10">
            <p className="text-sm font-semibold text-ink/70">Bu haftanın serisi</p>
            <h1 className="riso mt-3 font-display text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
              {featured.title}
            </h1>
            <p className="mt-4 text-sm font-semibold">{featured.genres.join(", ")}</p>
            <p className="balloon mt-6 max-w-md px-5 py-4 leading-relaxed">{featured.description}</p>
          </div>

          <Link
            href={`/seri/${featured.slug}`}
            className="panel-in block border-[3px] border-ink bg-ink md:col-span-4 md:row-span-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={featured.cover}
              alt={`${featured.title} kapağı`}
              className="aspect-[2/3] h-full w-full object-cover md:aspect-auto"
            />
          </Link>

          <Link
            href={`/seri/${featured.slug}/bolum/${featured.chapters[0]?.number ?? 1}`}
            className="tone-pink group flex items-end border-[3px] border-ink bg-white p-6 md:col-span-4"
          >
            <span className="font-display text-2xl leading-tight group-hover:underline group-hover:decoration-4 group-hover:underline-offset-4">
              Baştan okumaya başla
            </span>
          </Link>

          {featuredLatest && (
            <Link
              href={`/seri/${featured.slug}/bolum/${featuredLatest.number}`}
              className="group flex flex-col justify-between gap-4 border-[3px] border-ink bg-blue p-6 text-white md:col-span-4"
            >
              <span className="text-sm text-white/80">Son eklenen, {formatDate(featuredLatest.publishedAt)}</span>
              <span className="font-display text-2xl leading-tight group-hover:underline group-hover:decoration-4 group-hover:underline-offset-4">
                {featuredLatest.number}. bölüm: {featuredLatest.title}
              </span>
            </Link>
          )}
        </section>
      )}

      <section className="mt-16">
        <h2 className="font-display text-3xl">Son güncellenenler</h2>
        <ul className="mt-5 border-y-[3px] border-ink">
          {recent.map((s) => (
            <li key={s.slug} className="flex items-center gap-4 border-b-2 border-ink/15 py-3 last:border-b-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.cover} alt="" className="h-20 w-14 shrink-0 border-2 border-ink object-cover" />
              <div className="min-w-0 flex-1">
                <Link href={`/seri/${s.slug}`} className="font-display text-lg hover:text-blue">
                  {s.title}
                </Link>
                <p className="text-sm text-ink/60">{s.genres.join(", ")}</p>
              </div>
              <div className="hidden gap-2 sm:flex">
                {s.chapters.slice(-2).reverse().map((c) => (
                  <Link
                    key={c.number}
                    href={`/seri/${s.slug}/bolum/${c.number}`}
                    className="border-2 border-ink bg-white px-3 py-1.5 text-sm hover:bg-ink hover:text-paper"
                  >
                    <span className="font-semibold">{c.number}. bölüm</span>
                    <span className="ml-2 text-xs opacity-60">{formatDate(c.publishedAt)}</span>
                  </Link>
                ))}
              </div>
              {latestChapter(s) && (
                <Link
                  href={`/seri/${s.slug}/bolum/${latestChapter(s)!.number}`}
                  className="border-2 border-ink bg-white px-3 py-1.5 text-sm font-semibold sm:hidden"
                >
                  {latestChapter(s)!.number}. bölüm
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-3xl">Tüm seriler</h2>
          <span className="text-sm text-ink/60">{all.length} seri</span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {all.map((s) => (
            <SeriesCard key={s.slug} series={s} />
          ))}
        </div>
      </section>
    </div>
  );
}
