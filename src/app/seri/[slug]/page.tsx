import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContinueReading } from "@/components/ContinueReading";
import { GenreList, PopularList } from "@/components/Sidebar";
import { NewBadge, TimeAgo } from "@/components/TimeAgo";
import { JsonLd } from "@/components/JsonLd";
import { getAllGenres, getPopular, getSeries, getSeriesList } from "@/lib/data";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export async function generateStaticParams() {
  return (await getSeriesList()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata(props: PageProps<"/seri/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const series = await getSeries(slug);
  if (!series) return {};
  const path = `/seri/${series.slug}`;
  return {
    title: `${series.title} Oku`,
    description: `${series.title}: ${series.description}`.slice(0, 160),
    alternates: { canonical: path },
    openGraph: {
      type: "book",
      url: path,
      title: series.title,
      description: series.description,
      images: [{ url: absoluteUrl(series.cover), alt: `${series.title} kapağı` }],
    },
  };
}

export default async function SeriesPage(props: PageProps<"/seri/[slug]">) {
  const { slug } = await props.params;
  const [series, popular, genres] = await Promise.all([getSeries(slug), getPopular(), getAllGenres()]);
  if (!series) notFound();

  const first = series.chapters[0];
  const latest = series.chapters.at(-1);
  const chaptersDesc = [...series.chapters].reverse();

  const url = absoluteUrl(`/seri/${series.slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ComicSeries",
        "@id": url,
        url,
        name: series.title,
        description: series.description,
        image: absoluteUrl(series.cover),
        author: { "@type": "Person", name: series.author },
        genre: series.genres,
        inLanguage: "tr",
        ...(latest && { dateModified: latest.publishedAt }),
        hasPart: series.chapters.map((c) => ({
          "@type": "ComicIssue",
          issueNumber: c.number,
          name: c.title,
          url: absoluteUrl(`/seri/${series.slug}/bolum/${c.number}`),
          datePublished: c.publishedAt,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: series.title, item: url },
        ],
      },
    ],
  };

  return (
    <div>
      <JsonLd data={jsonLd} />
      {/* Bulanık kapak arka planlı başlık alanı */}
      <div className="relative overflow-hidden border-b border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={series.cover} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/40" />

        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:gap-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={series.cover}
            alt={`${series.title} kapağı`}
            className="mx-auto w-48 shrink-0 self-start rounded-xl shadow-2xl shadow-black/50 sm:mx-0 sm:w-56"
          />
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{series.title}</h1>
            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              {[
                ["Yazar", series.author],
                ["Durum", series.status],
                ["Bölüm", String(series.chapters.length)],
                ["Okunma", series.views.toLocaleString("tr-TR")],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {series.genres.map((g) => (
                <Link
                  key={g}
                  href={`/ara?tur=${encodeURIComponent(g)}`}
                  className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-accent hover:text-white"
                >
                  {g}
                </Link>
              ))}
            </div>
            <p className="mt-5 max-w-prose leading-relaxed text-fg/85">{series.description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {first && (
                <Link
                  href={`/seri/${series.slug}/bolum/${first.number}`}
                  className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:brightness-110"
                >
                  İlk bölümü oku
                </Link>
              )}
              {latest && latest !== first && (
                <Link
                  href={`/seri/${series.slug}/bolum/${latest.number}`}
                  className="rounded-lg bg-white/10 px-5 py-2.5 font-semibold hover:bg-white/20"
                >
                  Son bölüm: {latest.number}
                </Link>
              )}
              <ContinueReading slug={series.slug} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 grid max-w-7xl gap-10 px-4 lg:grid-cols-[1fr_300px]">
        <section className="min-w-0">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-bold">Bölümler</h2>
            <span className="text-sm text-muted">{series.chapters.length} bölüm</span>
          </div>
          {chaptersDesc.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface p-6 text-muted">
              Bu serinin ilk bölümü yakında eklenecek.
            </p>
          ) : (
            <ol className="grid gap-2 sm:grid-cols-2">
              {chaptersDesc.map((c) => (
                <li key={c.number}>
                  <Link
                    href={`/seri/${series.slug}/bolum/${c.number}`}
                    className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 hover:border-accent"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-semibold">
                        Bölüm {c.number}
                        <NewBadge iso={c.publishedAt} />
                      </span>
                      <span className="block truncate text-sm text-muted">{c.title}</span>
                    </span>
                    <TimeAgo iso={c.publishedAt} className="shrink-0 text-xs text-muted" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <aside className="space-y-6">
          <PopularList data={popular} />
          <GenreList genres={genres} />
        </aside>
      </div>
    </div>
  );
}
