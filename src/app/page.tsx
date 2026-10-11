import Link from "next/link";
import { HeroSlider } from "@/components/HeroSlider";
import { SeriesCard } from "@/components/SeriesCard";
import { GenreList, PopularList } from "@/components/Sidebar";
import { getAllGenres, getAllSeries, getPopular, getRecentlyUpdated } from "@/lib/data";

export default async function Home() {
  const [recent, all, popular, genres] = await Promise.all([
    getRecentlyUpdated(),
    getAllSeries(),
    getPopular(),
    getAllGenres(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <HeroSlider items={recent.slice(0, 5)} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-12">
          <section>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xl font-bold">Son güncellenenler</h2>
              <Link href="/ara" className="text-sm text-muted hover:text-accent">
                Tümünü gör
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
              {recent.map((s) => (
                <SeriesCard key={s.slug} series={s} />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xl font-bold">Tüm seriler</h2>
              <span className="text-sm text-muted">{all.length} seri</span>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-6">
              {all.map((s) => (
                <SeriesCard key={s.slug} series={s} chapters={0} />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <PopularList items={popular} />
          <GenreList genres={genres} />
        </aside>
      </div>
    </div>
  );
}
