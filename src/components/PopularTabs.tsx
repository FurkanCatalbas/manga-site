"use client";

import Link from "next/link";
import { useState } from "react";

export type PopularItem = {
  slug: string;
  title: string;
  cover: string;
  genres: string[];
  views: number;
  trend: { day: string; views: number }[];
};

const TABS = [
  { id: "gunluk", label: "Günlük" },
  { id: "haftalik", label: "Haftalık" },
  { id: "aylik", label: "Aylık" },
] as const;
type Period = (typeof TABS)[number]["id"];

const EMPTY: Record<Period, string> = {
  gunluk: "Bugün henüz okunma yok.",
  haftalik: "Bu hafta henüz okunma yok.",
  aylik: "Bu ay henüz okunma yok.",
};

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });

export function PopularTabs({ data }: { data: Record<Period, PopularItem[]> }) {
  const [period, setPeriod] = useState<Period>("haftalik");
  const items = data[period];

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Popüler</h2>
        <div role="tablist" aria-label="Dönem" className="flex rounded-lg bg-surface-2 p-0.5 text-xs font-semibold">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={period === t.id}
              onClick={() => setPeriod(t.id)}
              className={`rounded-md px-2.5 py-1 transition-colors ${period === t.id ? "bg-accent text-white" : "text-muted hover:text-fg"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{EMPTY[period]}</p>
      ) : (
        <ol key={period} role="tabpanel" className="popular-in space-y-3">
          {items.map((s, i) => (
            <li key={s.slug} className="flex items-center gap-3">
              <span className={`w-5 text-center text-lg font-extrabold ${i < 3 ? "text-accent" : "text-muted"}`}>
                {i + 1}
              </span>
              <Link href={`/seri/${s.slug}`} className="group flex min-w-0 flex-1 items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.cover} alt="" className="h-14 w-10 shrink-0 rounded-md object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold group-hover:text-accent">{s.title}</span>
                  <span className="block text-xs text-muted">
                    <span className="font-semibold text-fg">{s.views.toLocaleString("tr-TR")}</span> okunma
                  </span>
                </span>
              </Link>
              <Sparkline trend={s.trend} />
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 text-[11px] text-muted">Grafik: son 14 günün günlük okunması</p>
    </section>
  );
}

/** Son 14 günün okunma eğrisi. Her güne gelince o günün sayısı görünür. */
function Sparkline({ trend }: { trend: PopularItem["trend"] }) {
  const W = 72;
  const H = 28;
  const PAD = 3;
  const max = Math.max(1, ...trend.map((t) => t.views));
  const step = (W - PAD * 2) / Math.max(1, trend.length - 1);
  const pts = trend.map((t, i) => [PAD + i * step, H - PAD - (t.views / max) * (H - PAD * 2)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const area = `${line}L${pts.at(-1)![0].toFixed(1)},${H - PAD}L${PAD},${H - PAD}Z`;
  const total = trend.reduce((s, t) => s + t.views, 0);
  const [lx, ly] = pts.at(-1)!;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Son 14 günde ${total.toLocaleString("tr-TR")} okunma`}
      className="shrink-0 overflow-visible"
    >
      <path d={area} fill="var(--accent)" opacity={0.12} />
      <path
        d={line}
        pathLength={1}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="spark-draw"
      />
      <circle cx={lx} cy={ly} r={2.5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={1.5} />
      {/* Fareyle üstüne gelince gün gün değer (işaretten geniş hedefler) */}
      {trend.map((t, i) => (
        <rect key={t.day} x={pts[i][0] - step / 2} y={0} width={step} height={H} fill="transparent">
          <title>{`${fmtDay(t.day)}: ${t.views.toLocaleString("tr-TR")} okunma`}</title>
        </rect>
      ))}
    </svg>
  );
}
