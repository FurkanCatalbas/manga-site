import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContinueReading } from "@/components/ContinueReading";
import { formatDate, getAllSeries, getSeries } from "@/lib/data";

export async function generateStaticParams() {
  return (await getAllSeries()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata(props: PageProps<"/seri/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const series = await getSeries(slug);
  return series ? { title: series.title, description: series.description } : {};
}

export default async function SeriesPage(props: PageProps<"/seri/[slug]">) {
  const { slug } = await props.params;
  const series = await getSeries(slug);
  if (!series) notFound();

  const first = series.chapters[0];
  const chaptersDesc = [...series.chapters].reverse();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="grid gap-8 md:grid-cols-[280px_1fr] md:gap-12">
        <div className="mx-auto w-56 border-[3px] border-ink bg-white p-2 md:mx-0 md:w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={series.cover} alt={`${series.title} kapağı`} className="w-full" />
        </div>

        <div>
          <h1 className="riso font-display text-4xl leading-none sm:text-5xl">{series.title}</h1>
          <dl className="mt-6 grid max-w-md grid-cols-3 border-2 border-ink bg-white text-sm">
            {[
              ["Yazar", series.author],
              ["Durum", series.status],
              ["Bölüm", String(series.chapters.length)],
            ].map(([k, v], i) => (
              <div key={k} className={`px-3 py-2 ${i > 0 ? "border-l-2 border-ink" : ""}`}>
                <dt className="text-xs text-ink/60">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            {series.genres.map((g) => (
              <Link
                key={g}
                href={`/ara?tur=${encodeURIComponent(g)}`}
                className="rounded-full border-2 border-ink px-3 py-0.5 text-sm hover:bg-pink"
              >
                {g}
              </Link>
            ))}
          </div>

          <p className="mt-6 max-w-prose text-lg leading-relaxed">{series.description}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            {first && (
              <Link
                href={`/seri/${series.slug}/bolum/${first.number}`}
                className="border-[3px] border-ink bg-ink px-5 py-2.5 font-semibold text-paper hover:bg-blue"
              >
                1. bölümü oku
              </Link>
            )}
            <ContinueReading slug={series.slug} />
          </div>
        </div>
      </div>

      <section className="mt-16">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-3xl">Bölümler</h2>
          <span className="text-sm text-ink/60">Yeniden eskiye</span>
        </div>
        <ol className="mt-5 border-t-[3px] border-ink">
          {chaptersDesc.map((c) => (
            <li key={c.number}>
              <Link
                href={`/seri/${series.slug}/bolum/${c.number}`}
                className="group flex items-center gap-5 border-b-2 border-ink/15 py-4 hover:bg-white"
              >
                <span className="w-14 text-right font-display text-3xl text-ink/25 group-hover:text-pink">
                  {c.number}
                </span>
                <span className="flex-1 font-semibold">{c.title}</span>
                <span className="pr-3 text-sm text-ink/60">{formatDate(c.publishedAt)}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
