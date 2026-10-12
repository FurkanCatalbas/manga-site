"use client";

import Link from "next/link";
import { useState } from "react";
import { EyeIcon } from "@/components/icons";

export type PopularItem = {
  slug: string;
  title: string;
  cover: string;
  genres: string[];
  views: number;
};

const TABS = [
  { id: "gunluk", label: "Günlük" },
  { id: "haftalik", label: "Haftalık" },
  { id: "aylik", label: "Aylık" },
  { id: "tum", label: "Tümü" },
] as const;
type Period = (typeof TABS)[number]["id"];

const EMPTY: Record<Period, string> = {
  gunluk: "Bugün henüz okunma yok.",
  haftalik: "Bu hafta henüz okunma yok.",
  aylik: "Bu ay henüz okunma yok.",
  tum: "Henüz okunma yok.",
};

export function PopularTabs({ data }: { data: Record<Period, PopularItem[]> }) {
  const [period, setPeriod] = useState<Period>("haftalik");
  const items = data[period];

  return (
    <section className="panel p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-2 gap-y-3">
        <h2 className="text-lg font-bold">Popüler</h2>
        <div role="tablist" aria-label="Dönem" className="flex rounded-full bg-white/[0.05] p-1 text-xs font-semibold">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={period === t.id}
              onClick={() => setPeriod(t.id)}
              className={`rounded-full px-3 py-1 transition-colors ${period === t.id ? "bg-white/[0.12] text-fg" : "text-muted hover:text-fg"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{EMPTY[period]}</p>
      ) : (
        <ol key={period} role="tabpanel" className="popular-in space-y-1">
          {items.map((s, i) => (
            <li key={s.slug}>
              <Link
                href={`/seri/${s.slug}`}
                className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.04]"
              >
                <span
                  className={`w-6 text-center font-display text-xl ${i < 3 ? "text-gradient" : "text-muted/60"}`}
                >
                  {i + 1}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  referrerPolicy="no-referrer"
                  src={s.cover}
                  alt=""
                  className="h-16 w-12 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold transition-colors group-hover:text-accent">
                    {s.title}
                  </span>
                  {s.genres[0] && <span className="block truncate text-xs text-muted">{s.genres.slice(0, 2).join(" · ")}</span>}
                  <span className="mt-1 flex items-center gap-1 text-xs text-muted">
                    <EyeIcon size={13} />
                    <span className="font-semibold text-fg/90">{s.views.toLocaleString("tr-TR")}</span> okunma
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
