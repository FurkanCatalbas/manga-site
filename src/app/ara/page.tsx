import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { SeriesBrowser, SeriesBrowserFromUrl } from "@/components/SeriesBrowser";
import { getAllGenres, getPeriodViews, getSeriesList } from "@/lib/data";

export const metadata: Metadata = {
  title: "Keşfet: Tüm Seriler",
  description: "Tüm webtoon ve manga serileri. Türe ve duruma göre filtrele, popülerliğe göre sırala, adına göre ara.",
  alternates: { canonical: "/ara" },
};

export default async function SearchPage() {
  const [series, genres, views] = await Promise.all([getSeriesList(), getAllGenres(), getPeriodViews()]);
  const props = { series, genres, views };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Keşfet</h1>
        <Link href="/tur" className="group flex items-center gap-1 text-sm font-medium text-muted hover:text-fg">
          Tüm türler
          <ArrowRightIcon size={15} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      {/* Adres okunana kadar varsayılan liste gösterilir (sayfanın statik hâlinde de seriler olsun) */}
      <Suspense fallback={<SeriesBrowser {...props} />}>
        <SeriesBrowserFromUrl {...props} />
      </Suspense>
    </div>
  );
}
