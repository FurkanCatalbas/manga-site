import type { Metadata } from "next";
import { Suspense } from "react";
import { Search } from "@/components/Search";
import { getAllGenres, getAllSeries } from "@/lib/data";

export const metadata: Metadata = { title: "Seriler" };

export default async function SearchPage() {
  const [series, genres] = await Promise.all([getAllSeries(), getAllGenres()]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-extrabold">Seriler</h1>
      <Suspense>
        <Search series={series} genres={genres} />
      </Suspense>
    </div>
  );
}
