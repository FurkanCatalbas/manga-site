import type { Metadata } from "next";
import { HeroSlider } from "@/components/HeroSlider";
import { ContinueShelf } from "@/components/Library";
import { SectionHeader, SeriesCard } from "@/components/SeriesCard";
import { NewSeriesList, PopularList } from "@/components/Sidebar";
import { getFeatured, getNewest, getPopular, getRecentlyUpdated, toLibraryItems } from "@/lib/data";

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
      <h1 className="sr-only">webtooku: Webtoon ve manga oku</h1>
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
