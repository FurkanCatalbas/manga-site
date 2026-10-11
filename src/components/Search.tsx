"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { SeriesCard } from "@/components/SeriesCard";
import type { SeriesStatus, SeriesSummary } from "@/lib/series";

const normalize = (s: string) => s.toLocaleLowerCase("tr");

export function Search({ series, genres }: { series: SeriesSummary[]; genres: string[] }) {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [genre, setGenre] = useState(params.get("tur") ?? "");
  const [status, setStatus] = useState<SeriesStatus | "">("");

  const results = series.filter(
    (s) =>
      (!query || normalize(s.title).includes(normalize(query))) &&
      (!genre || s.genres.includes(genre)) &&
      (!status || s.status === status),
  );

  const field = "rounded-lg border border-line bg-surface px-3 py-2.5 focus:border-accent focus:outline-none";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Seri adı…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${field} min-w-60 flex-1`}
        />
        <select value={genre} onChange={(e) => setGenre(e.target.value)} className={field}>
          <option value="">Tüm türler</option>
          {genres.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as SeriesStatus | "")}
          className={field}
        >
          <option value="">Tüm durumlar</option>
          <option>Devam Ediyor</option>
          <option>Tamamlandı</option>
        </select>
      </div>

      {results.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8">
          <p className="text-lg font-bold">Bu filtrelere uyan seri yok</p>
          <p className="mt-2 text-muted">Farklı bir isim dene ya da tür ve durum filtrelerini kaldır.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((s) => (
            <SeriesCard key={s.slug} series={s} chapters={1} />
          ))}
        </div>
      )}
    </div>
  );
}
