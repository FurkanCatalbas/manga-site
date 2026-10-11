import type { Metadata } from "next";
import { Suspense } from "react";
import { Search } from "@/components/Search";
import { getAllGenres, getAllSeries } from "@/lib/data";

export const metadata: Metadata = { title: "Ara" };

export default async function SearchPage() {
  const [series, genres] = await Promise.all([getAllSeries(), getAllGenres()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <h1 className="riso mb-8 font-display text-4xl sm:text-5xl">Seri ara</h1>
      <Suspense>
        <Search series={series} genres={genres} />
      </Suspense>
    </div>
  );
}
