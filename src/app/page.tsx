import type { Metadata } from "next";
import { HeroSlider } from "@/components/HeroSlider";
import { ContinueShelf } from "@/components/Library";
import { SectionHeader, SeriesCard } from "@/components/SeriesCard";
import { NewSeriesList, PopularList } from "@/components/Sidebar";
import { JsonLd } from "@/components/JsonLd";
import { getFeatured, getNewest, getPopular, getRecentlyUpdated, toLibraryItems } from "@/lib/data";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

// Site adı ve logosu için yapısal veri: Google sonuçlarda site adını "webtooku" olarak gösterebilir
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#site"),
      url: absoluteUrl("/"),
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "tr",
      publisher: { "@id": absoluteUrl("/#org") },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: absoluteUrl("/ara?q={search_term_string}") },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": absoluteUrl("/#org"),
      name: SITE_NAME,
      url: absoluteUrl("/"),
      logo: absoluteUrl("/icons/icon-512.png"),
    },
  ],
};

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const [recent, popular, featured, newest] = await Promise.all([
    getRecentlyUpdated(),
    getPopular(),
    getFeatured(),
    getNewest(7),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:pt-6">
      <JsonLd data={jsonLd} />
      <h1 className="sr-only">webtooku: Reklamsız ve ücretsiz Türkçe webtoon, manga oku</h1>
      <HeroSlider items={featured} />

      <ContinueShelf items={toLibraryItems(recent)} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <section className="min-w-0">
          <SectionHeader title="Son güncellenenler" href="/ara" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4">
            {recent.map((s) => (
              <SeriesCard key={s.slug} series={s} hot />
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <PopularList data={popular} />
          <NewSeriesList series={newest} />
        </aside>
      </div>
    </div>
  );
}
