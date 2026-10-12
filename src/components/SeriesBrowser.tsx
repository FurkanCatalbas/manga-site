"use client";

// Seri listesi: arama, tür ve durum filtreleri, sıralama ve sayfalama. Keşfet (/ara) ve tür
// sayfaları (/tur/...) kullanır. Tüm seriler zaten elde olduğu için süzme tarayıcıda yapılır;
// Keşfet'te seçimler adrese de yazılır (paylaşılabilir, geri gelince korunur).
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "@/components/icons";
import { SeriesCard } from "@/components/SeriesCard";
import type { Period, PeriodViews, SeriesStatus, SeriesSummary } from "@/lib/series";

const PAGE_SIZE = 24;
const normalize = (s: string) => s.toLocaleLowerCase("tr");

const SORTS = {
  guncel: "Son güncellenen",
  yeni: "Yeni eklenen",
  populer: "En popüler",
  puan: "En yüksek puan",
  az: "A-Z",
} as const;
type Sort = keyof typeof SORTS;

const PERIODS: Record<Period, string> = {
  gunluk: "Bugün",
  haftalik: "Bu hafta",
  aylik: "Bu ay",
  tum: "Tüm zamanlar",
};

// Adresteki durum değerleri kısa ve Türkçe karaktersiz
const STATUSES: { value: SeriesStatus | ""; param: string; label: string }[] = [
  { value: "", param: "", label: "Hepsi" },
  { value: "Devam Ediyor", param: "devam", label: "Devam ediyor" },
  { value: "Tamamlandı", param: "tamam", label: "Tamamlandı" },
];

export type BrowseState = {
  query: string;
  genre: string;
  status: SeriesStatus | "";
  sort: Sort;
  period: Period;
  page: number;
};

export const DEFAULT_BROWSE: BrowseState = { query: "", genre: "", status: "", sort: "guncel", period: "haftalik", page: 1 };

/** Adres parametrelerinden (q, tur, durum, sira, donem, sayfa) başlangıç durumu. */
export function parseBrowseParams(params: URLSearchParams): BrowseState {
  const sort = params.get("sira") ?? "";
  const period = params.get("donem") ?? "";
  const page = Number(params.get("sayfa"));
  return {
    query: params.get("q") ?? "",
    genre: params.get("tur") ?? "",
    status: STATUSES.find((s) => s.param && s.param === params.get("durum"))?.value ?? "",
    sort: sort in SORTS ? (sort as Sort) : DEFAULT_BROWSE.sort,
    period: period in PERIODS ? (period as Period) : DEFAULT_BROWSE.period,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

function toParams(s: BrowseState) {
  const p = new URLSearchParams();
  if (s.query.trim()) p.set("q", s.query.trim());
  if (s.genre) p.set("tur", s.genre);
  const status = STATUSES.find((x) => x.value === s.status)?.param;
  if (status) p.set("durum", status);
  if (s.sort !== DEFAULT_BROWSE.sort) p.set("sira", s.sort);
  if (s.sort === "populer" && s.period !== DEFAULT_BROWSE.period) p.set("donem", s.period);
  if (s.page > 1) p.set("sayfa", String(s.page));
  return p.toString();
}

type Ratings = Record<string, { avg: number; count: number }>;

function sortSeries(list: SeriesSummary[], sort: Sort, period: Period, views: Record<string, PeriodViews>, ratings: Ratings) {
  const latest = (s: SeriesSummary) => s.latestChapters[0]?.publishedAt ?? "";
  const v = (s: SeriesSummary, p: Period) => views[s.slug]?.[p] ?? (p === "tum" ? s.views : 0);
  const sorted = [...list];
  switch (sort) {
    case "guncel":
      return sorted.sort((a, b) => latest(b).localeCompare(latest(a)));
    case "yeni":
      return sorted.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    case "populer":
      // Dönemde eşitlik varsa (ör. ikisi de 0) toplam okunma belirler
      return sorted.sort((a, b) => v(b, period) - v(a, period) || v(b, "tum") - v(a, "tum"));
    case "puan":
      // Puanı olmayanlar sona; eşit ortalamada çok puan alan önce
      return sorted.sort(
        (a, b) => (ratings[b.slug]?.avg ?? -1) - (ratings[a.slug]?.avg ?? -1) || (ratings[b.slug]?.count ?? 0) - (ratings[a.slug]?.count ?? 0),
      );
    case "az":
      return sorted.sort((a, b) => a.title.localeCompare(b.title, "tr"));
  }
}

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

/** Sayfa numaraları: ilk, son ve geçerli sayfanın komşuları; aradakiler "…" */
function pageItems(page: number, total: number): (number | "…")[] {
  const keep = new Set([1, total, page - 1, page, page + 1].filter((n) => n >= 1 && n <= total));
  const items: (number | "…")[] = [];
  let prev = 0;
  for (const n of [...keep].sort((a, b) => a - b)) {
    if (n - prev > 2) items.push("…");
    else if (n - prev === 2) items.push(n - 1);
    items.push(n);
    prev = n;
  }
  return items;
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  if (total <= 1) return null;
  const arrow = "flex h-10 items-center gap-1 rounded-full px-3 text-sm font-semibold ring-1 ring-white/[0.08] transition-colors enabled:hover:bg-white/[0.08] disabled:opacity-35";
  return (
    <nav aria-label="Sayfalar" className="flex items-center justify-center gap-1.5 sm:gap-2">
      <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)} className={arrow} aria-label="Önceki sayfa">
        <ChevronLeftIcon size={16} />
        <span className="hidden sm:inline">Önceki</span>
      </button>
      <ol className="flex items-center gap-1">
        {pageItems(page, total).map((n, i) =>
          n === "…" ? (
            <li key={`e${i}`} aria-hidden className="w-6 text-center text-muted">
              …
            </li>
          ) : (
            <li key={n}>
              <button
                type="button"
                onClick={() => onChange(n)}
                aria-current={n === page ? "page" : undefined}
                aria-label={`Sayfa ${n}`}
                className={`grid h-10 min-w-10 place-items-center rounded-full px-2 text-sm font-semibold transition-colors ${
                  n === page ? "bg-fg text-bg" : "text-fg/80 hover:bg-white/[0.08]"
                }`}
              >
                {n}
              </button>
            </li>
          ),
        )}
      </ol>
      <button type="button" disabled={page === total} onClick={() => onChange(page + 1)} className={arrow} aria-label="Sonraki sayfa">
        <span className="hidden sm:inline">Sonraki</span>
        <ChevronRightIcon size={16} />
      </button>
    </nav>
  );
}

export function SeriesBrowser({
  series,
  views,
  ratings = {},
  genres,
  initial = DEFAULT_BROWSE,
  syncUrl = false,
}: {
  series: SeriesSummary[];
  /** Dönemsel okunmalar (popülerliğe göre sıralama için), slug'a göre */
  views: Record<string, PeriodViews>;
  /** Seri puanları (ortalama ve sayı), slug'a göre */
  ratings?: Ratings;
  /** Verilirse tür çipleri gösterilir (tür sayfalarında tür zaten belli) */
  genres?: string[];
  initial?: BrowseState;
  /** Seçimleri adres satırına yaz */
  syncUrl?: boolean;
}) {
  const [state, setState] = useState(initial);
  const topRef = useRef<HTMLDivElement>(null);
  // Filtre değişince ilk sayfaya dönülür
  const update = (patch: Partial<BrowseState>) => setState((s) => ({ ...s, page: 1, ...patch }));

  useEffect(() => {
    if (!syncUrl) return;
    const qs = toParams(state);
    const url = `${location.pathname}${qs ? `?${qs}` : ""}`;
    if (url !== location.pathname + location.search) history.replaceState(null, "", url);
  }, [state, syncUrl]);

  const q = normalize(state.query.trim());
  const filtered = series.filter(
    (s) =>
      (!q || [s.title, s.titleAlt, ...s.altTitles].some((t) => normalize(t).includes(q))) &&
      (!state.genre || s.genres.includes(state.genre)) &&
      (!state.status || s.status === state.status),
  );
  const results = sortSeries(filtered, state.sort, state.period, views, ratings);
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(state.page, totalPages);
  const shown = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goTo = (n: number) => {
    setState((s) => ({ ...s, page: n }));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="relative">
          <SearchIcon size={19} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            aria-label="Seri adı (Türkçe ya da İngilizce)"
            placeholder="Seri adı ara (Türkçe ya da İngilizce)…"
            value={state.query}
            onChange={(e) => update({ query: e.target.value })}
            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] py-3.5 pr-4 pl-12 text-base placeholder:text-muted focus:border-accent/60 focus:outline-none"
          />
        </div>
        {/* Mobilde yatay kayan filtreler */}
        {genres && (
          <div role="group" aria-label="Tür" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            <Chip active={state.genre === ""} onClick={() => update({ genre: "" })}>
              Tüm türler
            </Chip>
            {genres.map((g) => (
              <Chip key={g} active={state.genre === g} onClick={() => update({ genre: state.genre === g ? "" : g })}>
                {g}
              </Chip>
            ))}
          </div>
        )}
        <div role="group" aria-label="Durum" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {STATUSES.map((st) => (
            <Chip key={st.label} active={state.status === st.value} onClick={() => update({ status: st.value })}>
              {st.label}
            </Chip>
          ))}
        </div>
      </div>

      <div ref={topRef} className="scroll-mt-24 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">{results.length} seri</p>
          <label className="relative flex items-center gap-2 text-sm text-muted">
            <span className="hidden sm:inline">Sırala</span>
            <select
              value={state.sort}
              onChange={(e) => update({ sort: e.target.value as Sort })}
              className="appearance-none rounded-full bg-white/[0.04] py-1.5 pr-9 pl-3.5 font-semibold text-fg ring-1 ring-white/[0.08] focus:ring-accent/60 focus:outline-none [&>option]:bg-surface"
            >
              {Object.entries(SORTS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDownIcon size={16} className="pointer-events-none absolute right-3 text-muted" />
          </label>
        </div>
        {state.sort === "populer" && (
          <div role="group" aria-label="Dönem" className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="inline-flex rounded-full bg-white/[0.05] p-1 text-sm font-semibold">
              {(Object.entries(PERIODS) as [Period, string][]).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={state.period === id}
                  onClick={() => update({ period: id })}
                  className={`rounded-full px-3 py-1 whitespace-nowrap transition-colors ${
                    state.period === id ? "bg-white/[0.12] text-fg" : "text-muted hover:text-fg"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-lg font-bold">Bu filtrelere uyan seri yok</p>
          <p className="mt-2 text-muted">Farklı bir isim dene ya da filtreleri kaldır.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-6">
          {shown.map((s) => (
            <SeriesCard key={s.slug} series={s} chapters={1} rating={ratings[s.slug]?.avg} />
          ))}
        </div>
      )}

      <Pagination page={page} total={totalPages} onChange={goTo} />
    </div>
  );
}

/** Keşfet için: başlangıç durumu adresten okunur (cacheComponents gereği <Suspense> içinde kullanılmalı). */
export function SeriesBrowserFromUrl(props: Omit<Parameters<typeof SeriesBrowser>[0], "initial" | "syncUrl">) {
  const params = useSearchParams();
  return <SeriesBrowser {...props} initial={parseBrowseParams(params)} syncUrl />;
}
