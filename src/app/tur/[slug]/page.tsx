import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { ChevronRightIcon } from "@/components/icons";
import { SeriesBrowser } from "@/components/SeriesBrowser";
import { getGenres, getPeriodViews, getSeriesList } from "@/lib/data";
import { slugify } from "@/lib/slug";
import { absoluteUrl, PLACEHOLDER_SLUG, SITE_NAME } from "@/lib/site";

export async function generateStaticParams() {
  const params = (await getGenres()).map((g) => ({ slug: g.slug }));
  // cacheComponents boş liste kabul etmiyor: hiç tür yokken yer tutucu 404 verir
  return params.length ? params : [{ slug: PLACEHOLDER_SLUG }];
}

async function findGenre(slug: string) {
  return (await getGenres()).find((g) => g.slug === slug);
}

export async function generateMetadata(props: PageProps<"/tur/[slug]">): Promise<Metadata> {
  const genre = await findGenre((await props.params).slug);
  if (!genre) return {};
  const path = `/tur/${genre.slug}`;
  const description = `${genre.name} türündeki ${genre.count} webtoon ve manga serisini ${SITE_NAME}'da ücretsiz ve Türkçe oku.`;
  return {
    title: `${genre.name} Webtoon ve Manga Oku`,
    description,
    alternates: { canonical: path },
    openGraph: { url: path, title: `${genre.name} Webtoon ve Manga`, description },
  };
}

export default async function GenrePage(props: PageProps<"/tur/[slug]">) {
  const { slug } = await props.params;
  const [genres, all, views] = await Promise.all([getGenres(), getSeriesList(), getPeriodViews()]);
  const genre = genres.find((g) => g.slug === slug);
  if (!genre) notFound();

  const series = all.filter((s) => s.genres.some((g) => slugify(g) === genre.slug));
  const others = genres.filter((g) => g.slug !== genre.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Türler", item: absoluteUrl("/tur") },
      { "@type": "ListItem", position: 3, name: genre.name, item: absoluteUrl(`/tur/${genre.slug}`) },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <JsonLd data={jsonLd} />
      <nav aria-label="Konum" className="mb-3 flex items-center gap-1 text-sm text-muted">
        <Link href="/tur" className="hover:text-fg">
          Türler
        </Link>
        <ChevronRightIcon size={14} />
        <span className="text-fg/80">{genre.name}</span>
      </nav>
      <h1 className="font-display text-3xl tracking-tight sm:text-4xl">{genre.name}</h1>
      <p className="mt-2 max-w-prose text-muted">
        {genre.name} türündeki webtoon ve manga serileri. Son güncellenene, popülerliğe ya da ada göre sırala.
      </p>

      <div className="mt-6">
        <SeriesBrowser series={series} views={views} />
      </div>

      {others.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-3 text-lg font-bold">Diğer türler</h2>
          <div className="flex flex-wrap gap-2">
            {others.map((g) => (
              <Link
                key={g.slug}
                href={`/tur/${g.slug}`}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm transition-colors hover:border-accent/50 hover:text-accent"
              >
                {g.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
