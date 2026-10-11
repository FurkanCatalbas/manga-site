"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon } from "@/components/icons";
import type { SeriesSummary } from "@/lib/series";

const INTERVAL = 6000;

export function HeroSlider({ items }: { items: SeriesSummary[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
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
      // Mobilde parmakla sağa/sola kaydırarak geçiş
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
      }}
      className="relative -mx-4 overflow-hidden bg-surface sm:mx-0 sm:rounded-3xl sm:ring-1 sm:ring-white/[0.08]"
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
            className={`transition-opacity ${active ? "relative opacity-100 duration-700" : "absolute inset-0 opacity-0 duration-300"}`}
          >
            {/* Bulanık kapak arka planı */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.cover}
              alt=""
              className={`absolute inset-0 h-full w-full object-cover opacity-50 blur-3xl transition-transform duration-[6s] ease-out ${active ? "scale-110" : "scale-125"}`}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-bg/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-transparent to-transparent" />

            <div className="relative flex min-h-[340px] items-center gap-5 px-4 pt-8 pb-16 sm:min-h-[400px] sm:gap-10 sm:px-10 sm:pt-12 sm:pb-20">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-1.5">
                  {s.genres.slice(0, 3).map((g) => (
                    <span
                      key={g}
                      className="rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md"
                    >
                      {g}
                    </span>
                  ))}
                </div>
                <h2 className="mt-3 font-display text-3xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{s.title}</h2>
                <p className="mt-3 line-clamp-2 max-w-xl text-sm text-fg/75 sm:line-clamp-3 sm:text-lg">{s.description}</p>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {first !== null && (
                    <Link href={`/seri/${s.slug}/bolum/${first}`} className="btn-primary">
                      <PlayIcon size={16} />
                      Okumaya başla
                    </Link>
                  )}
                  {latest !== undefined && latest !== first && (
                    <Link href={`/seri/${s.slug}/bolum/${latest}`} className="btn-ghost">
                      Son bölüm: {latest}
                    </Link>
                  )}
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.cover}
                alt={`${s.title} kapağı`}
                className="w-28 shrink-0 rounded-2xl shadow-2xl ring-1 shadow-black/60 ring-white/15 sm:w-44 lg:w-56"
              />
            </div>
          </div>
        );
      })}

      {count > 1 && (
        <div className="absolute bottom-5 left-4 flex items-center gap-4 sm:left-10">
          <div className="flex gap-1.5">
            {items.map((s, i) => (
              <button
                key={s.slug}
                aria-label={`${i + 1}. seriye geç`}
                aria-current={i === index}
                onClick={() => go(i)}
                className={`relative h-1.5 overflow-hidden rounded-full bg-white/20 transition-all duration-300 ${i === index ? "w-8" : "w-1.5 hover:bg-white/40"}`}
              >
                {/* Aktif noktada bir sonraki seriye kalan süre dolar */}
                {i === index && (
                  <span
                    key={index}
                    className="hero-fill absolute inset-y-0 left-0 rounded-full bg-accent"
                    style={{ animationPlayState: paused ? "paused" : "running" }}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="hidden gap-2 sm:flex">
            <button aria-label="Önceki" onClick={() => go(index - 1)} className="btn-ghost h-10 w-10 !rounded-full !p-0">
              <ChevronLeftIcon size={18} />
            </button>
            <button aria-label="Sonraki" onClick={() => go(index + 1)} className="btn-ghost h-10 w-10 !rounded-full !p-0">
              <ChevronRightIcon size={18} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
