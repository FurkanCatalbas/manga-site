import Link from "next/link";
import { HeroSlider } from "@/components/HeroSlider";
import { SeriesCard } from "@/components/SeriesCard";
import { GenreList, PopularList } from "@/components/Sidebar";
import { getAllGenres, getPopular, getRecentlyUpdated } from "@/lib/data";

export default async function Home() {
  const [recent, popular, genres] = await Promise.all([
    getRecentlyUpdated(),
    getPopular(),
    getAllGenres(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <HeroSlider items={recent.slice(0, 5)} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
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
        </div>

        <aside className="space-y-6">
          <PopularList data={popular} />
          <GenreList genres={genres} />
        </aside>
      </div>
    </div>
  );
}
