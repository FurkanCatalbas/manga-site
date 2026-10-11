"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SeriesSummary } from "@/lib/series";

const INTERVAL = 6000;

export function HeroSlider({ items }: { items: SeriesSummary[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  useEffect(() => {
    if (paused || count < 2) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL);
    return () => clearTimeout(t);
  }, [index, paused, count]);

  if (count === 0) return null;
  const go = (i: number) => setIndex((i + count) % count);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Öne çıkan seriler"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="relative overflow-hidden rounded-2xl border border-line bg-surface"
    >
      {items.map((s, i) => {
        const first = s.firstChapter;
        const latest = s.latestChapters[0]?.number;
        const active = i === index;
        return (
          <div
            key={s.slug}
            aria-hidden={!active}
            inert={!active}
            className={`transition-opacity ${active ? "relative opacity-100 delay-150 duration-500" : "absolute inset-0 opacity-0 duration-150"}`}
          >
            {/* Bulanık kapak arka planı */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.cover} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
            <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-bg/30" />

            <div className="relative flex min-h-[300px] items-center gap-6 p-6 sm:min-h-[360px] sm:gap-10 sm:p-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.cover}
                alt={`${s.title} kapağı`}
                className="hidden w-44 shrink-0 rounded-xl shadow-2xl shadow-black/50 sm:block lg:w-52"
              />
              <div className="max-w-xl">
                <div className="flex flex-wrap gap-2">
                  {s.genres.map((g) => (
                    <span key={g} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium">
                      {g}
                    </span>
                  ))}
                </div>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl">{s.title}</h2>
                <p className="mt-3 line-clamp-3 text-muted sm:text-lg">{s.description}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {first !== null && (
                    <Link
                      href={`/seri/${s.slug}/bolum/${first}`}
                      className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:brightness-110"
                    >
                      Okumaya başla
                    </Link>
                  )}
                  {latest !== undefined && latest !== first && (
                    <Link
                      href={`/seri/${s.slug}/bolum/${latest}`}
                      className="rounded-lg bg-white/10 px-5 py-2.5 font-semibold hover:bg-white/20"
                    >
                      Son bölüm: {latest}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {count > 1 && (
        <div className="absolute right-4 bottom-4 flex items-center gap-3">
          <div className="flex gap-1.5">
            {items.map((s, i) => (
              <button
                key={s.slug}
                aria-label={`${i + 1}. seriye geç`}
                aria-current={i === index}
                onClick={() => go(i)}
                className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-accent" : "w-2 bg-white/30 hover:bg-white/60"}`}
              />
            ))}
          </div>
          <button aria-label="Önceki" onClick={() => go(index - 1)} className="grid h-9 w-9 place-items-center rounded-full bg-black/40 hover:bg-black/70">
            ‹
          </button>
          <button aria-label="Sonraki" onClick={() => go(index + 1)} className="grid h-9 w-9 place-items-center rounded-full bg-black/40 hover:bg-black/70">
            ›
          </button>
        </div>
      )}
    </section>
  );
}
