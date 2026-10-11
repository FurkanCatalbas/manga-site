import Link from "next/link";
import { latestChapter, type Series } from "@/lib/series";

export function SeriesCard({ series }: { series: Series }) {
  const latest = latestChapter(series);
  return (
    <Link href={`/seri/${series.slug}`} className="group block">
      <div className="aspect-[2/3] border-2 border-ink bg-white p-1.5 transition-transform group-hover:-translate-y-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- kapaklar CDN'den doğrudan gelecek */}
        <img src={series.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
      </div>
      <h3 className="mt-3 font-display text-base leading-tight group-hover:text-blue">
        {series.title}
      </h3>
      <p className="mt-1 text-sm text-ink/60">
        {latest ? `${latest.number}. bölüm` : "Yakında"}, {series.status.toLocaleLowerCase("tr")}
      </p>
    </Link>
  );
}
