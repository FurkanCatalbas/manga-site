"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "@/components/icons";
import { SeriesCard } from "@/components/SeriesCard";
import type { SeriesStatus, SeriesSummary } from "@/lib/series";

const normalize = (s: string) => s.toLocaleLowerCase("tr");
const STATUSES: (SeriesStatus | "")[] = ["", "Devam Ediyor", "Tamamlandı"];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap ring-1 transition-colors ${
        active ? "bg-fg text-bg ring-fg" : "bg-white/[0.04] text-fg/80 ring-white/[0.08] hover:bg-white/[0.08]"
      }`}
    >
      {children}
    </button>
  );
}

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

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="relative">
          <SearchIcon size={19} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            aria-label="Seri adı"
            placeholder="Seri adı ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] py-3.5 pr-4 pl-12 text-base placeholder:text-muted focus:border-accent/60 focus:outline-none"
          />
        </div>
        {/* Mobilde yatay kayan filtreler */}
        <div role="group" aria-label="Tür" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={genre === ""} onClick={() => setGenre("")}>
            Tüm türler
          </Chip>
          {genres.map((g) => (
            <Chip key={g} active={genre === g} onClick={() => setGenre(genre === g ? "" : g)}>
              {g}
            </Chip>
          ))}
        </div>
        <div role="group" aria-label="Durum" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {STATUSES.map((st) => (
            <Chip key={st || "hepsi"} active={status === st} onClick={() => setStatus(st)}>
              {st || "Hepsi"}
            </Chip>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted">{results.length} seri</p>

      {results.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-lg font-bold">Bu filtrelere uyan seri yok</p>
          <p className="mt-2 text-muted">Farklı bir isim dene ya da tür ve durum filtrelerini kaldır.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-6">
          {results.map((s) => (
            <SeriesCard key={s.slug} series={s} chapters={1} />
          ))}
        </div>
      )}
    </div>
  );
}
