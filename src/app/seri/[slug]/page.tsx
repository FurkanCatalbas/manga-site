import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExclusiveBadge } from "@/components/Badges";
import { GenreList, PopularList } from "@/components/Sidebar";
import { EyeIcon, LayersIcon } from "@/components/icons";
import { ChapterList, ReadButtons } from "@/components/SeriesActions";
import { SectionHeader, SeriesCard } from "@/components/SeriesCard";
import { ShareButton } from "@/components/ShareButton";
import { CommentsSection } from "@/components/topluluk/Sections";
import { SourceNotice } from "@/components/SourceNotice";
import { getSeriesSource } from "@/lib/fansubs";
import { JsonLd } from "@/components/JsonLd";
import { genreHref, getAllGenres, getPopular, getSeries, getSeriesList, getSimilarSeries, type Series } from "@/lib/data";
import { absoluteUrl, PLACEHOLDER_SLUG, SITE_NAME } from "@/lib/site";

export async function generateStaticParams() {
  const params = (await getSeriesList()).map((s) => ({ slug: s.slug }));
  // cacheComponents boş liste kabul etmiyor (hiç seri yokken build kırılmasın): yer tutucu 404 verir
  return params.length ? params : [{ slug: PLACEHOLDER_SLUG }];
}

/** Başlık dışındaki tüm adlar: Türkçe ad (İngilizce ad başlıksa) ve diğer adları */
const otherNames = (s: Series) => [s.titleAlt, ...s.altTitles].filter(Boolean);

export async function generateMetadata(props: PageProps<"/seri/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const series = await getSeries(slug);
  if (!series) return {};
  const path = `/seri/${series.slug}`;
  const names = otherNames(series);
  const description = `${series.title}${names.length ? ` (${names.slice(0, 2).join(", ")})` : ""} Türkçe oku. ${series.description}`;
  return {
    title: `${series.title} Türkçe Oku`,
    description: description.length > 160 ? `${description.slice(0, 157).trimEnd()}…` : description,
    alternates: { canonical: path },
    openGraph: {
      type: "book",
      url: path,
      title: series.title,
      description: series.description,
      images: [{ url: `/paylasim/${series.slug}`, width: 1200, height: 630, alt: `${series.title} kapağı` }],
    },
  };
}

export default async function SeriesPage(props: PageProps<"/seri/[slug]">) {
  const { slug } = await props.params;
  const [series, popular, genres, source, similar] = await Promise.all([
    getSeries(slug),
    getPopular(),
    getAllGenres(),
    getSeriesSource(slug),
    getSimilarSeries(slug),
  ]);
  if (!series) notFound();
  const names = otherNames(series);

  const first = series.chapters[0];
  const latest = series.chapters.at(-1);

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
        ...(names.length > 0 && { alternateName: names }),
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
      <div className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img referrerPolicy="no-referrer" src={series.cover} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-bg/80 to-bg" />

        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-8 pb-10 sm:flex-row sm:gap-10 sm:pt-12">
          <div className="flex gap-4 sm:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              referrerPolicy="no-referrer"
              src={series.cover}
              alt={`${series.title} kapağı`}
              className="w-32 shrink-0 self-start rounded-2xl shadow-2xl ring-1 shadow-black/60 ring-white/15 sm:w-56 lg:w-64"
            />
            {/* Mobilde başlık kapağın yanında */}
            <div className="min-w-0 self-end sm:hidden">
              <h1 className="font-display text-2xl leading-tight tracking-tight">{series.title}</h1>
              {series.titleAlt && <p className="mt-1 text-sm text-muted">{series.titleAlt}</p>}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="hidden font-display text-4xl leading-[1.05] tracking-tight sm:block lg:text-5xl">
              {series.title}
            </h1>
            {series.titleAlt && <p className="mt-2 hidden text-muted sm:block">{series.titleAlt}</p>}

            <div className="flex flex-wrap items-center gap-2 text-sm sm:mt-5">
              {series.exclusive && <ExclusiveBadge long />}
              <span className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 font-semibold">
                <span className={`h-2 w-2 rounded-full ${series.status === "Tamamlandı" ? "bg-accent-2" : "bg-fresh"}`} />
                {series.status}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 font-semibold">
                <LayersIcon size={15} className="text-muted" />
                {series.chapters.length} bölüm
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 font-semibold">
                <EyeIcon size={15} className="text-muted" />
                {series.views.toLocaleString("tr-TR")} okunma
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {series.genres.map((g) => (
                <Link
                  key={g}
                  href={genreHref(g)}
                  className="rounded-full border border-white/10 px-3 py-1 text-sm text-fg/85 transition-colors hover:border-accent/50 hover:text-accent"
                >
                  {g}
                </Link>
              ))}
            </div>
            <p className="mt-5 max-w-prose leading-relaxed text-fg/80">{series.description}</p>
            {series.altTitles.length > 0 && (
              <p className="mt-3 max-w-prose text-sm text-muted">
                <span className="font-semibold text-fg/70">Diğer adları: </span>
                {series.altTitles.join(" · ")}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <ReadButtons slug={series.slug} first={first?.number ?? null} latest={latest?.number ?? null} />
              <ShareButton url={url} title={`${series.title} Türkçe oku`} className="w-full sm:w-auto" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-4 grid max-w-7xl gap-10 px-4 lg:grid-cols-[1fr_320px]">
        <section className="min-w-0">
          <ChapterList
            slug={series.slug}
            chapters={series.chapters}
            notice={source && <SourceNotice source={source} />}
          />
          <div className="mt-14">
            <CommentsSection slug={series.slug} />
          </div>
          {similar.length > 0 && (
            <section className="mt-14">
              <SectionHeader title="Benzer seriler" />
              <div className="grid grid-cols-3 gap-x-3 gap-y-6 md:grid-cols-6">
                {similar.map((s) => (
                  <SeriesCard key={s.slug} series={s} chapters={0} />
                ))}
              </div>
            </section>
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
