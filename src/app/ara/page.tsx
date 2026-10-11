import type { Metadata } from "next";
import { Suspense } from "react";
import { Search } from "@/components/Search";
import { getAllGenres, getSeriesList } from "@/lib/data";

export const metadata: Metadata = {
  title: "Tüm Seriler",
  description: "Tüm webtoon ve manga serileri. Türe ve duruma göre filtrele, adına göre ara.",
  alternates: { canonical: "/ara" },
};

export default async function SearchPage() {
  const [series, genres] = await Promise.all([getSeriesList(), getAllGenres()]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">Keşfet</h1>
      <Suspense>
        <Search series={series} genres={genres} />
      </Suspense>
    </div>
  );
}
