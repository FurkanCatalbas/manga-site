"use client";

// Seri sayfasının okuma geçmişine göre değişen kısımları: ana düğme ve bölüm listesi.
import Link from "next/link";
import { useState } from "react";
import { CheckIcon, PlayIcon, SortIcon } from "@/components/icons";
import { NewBadge, TimeAgo } from "@/components/TimeAgo";
import { useAllProgress } from "@/lib/progress";
import type { ChapterInfo } from "@/lib/series";

/** Okuma geçmişi varsa "Devam et", yoksa "İlk bölümü oku". */
export function ReadButtons({ slug, first, latest }: { slug: string; first: number | null; latest: number | null }) {
  const progress = useAllProgress()[slug];
  if (first === null) return null;

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row">
      {progress ? (
        <Link href={`/seri/${slug}/bolum/${progress.chapter}`} className="btn-primary">
          <PlayIcon size={16} />
          Devam et · Bölüm {progress.chapter}
        </Link>
      ) : (
        <Link href={`/seri/${slug}/bolum/${first}`} className="btn-primary">
          <PlayIcon size={16} />
          İlk bölümü oku
        </Link>
      )}
      {latest !== null && latest !== first && latest !== progress?.chapter && (
        <Link href={`/seri/${slug}/bolum/${latest}`} className="btn-ghost">
          Son bölüm: {latest}
        </Link>
      )}
    </div>
  );
}

const FIRST_PAGE = 10;
const STEP = 30;

/** Bölüm listesi: en yeni ya da en eski önce; okunanlar ve kalınan bölüm işaretli. Önce 10 bölüm görünür,
 * "Daha fazla" ile 30'ar 30'ar açılır. Gizli bölümler de HTML'de durur (`hidden`), böylece arama motorları
 * tüm bölüm bağlantılarını seri sayfasından izleyebilir. */
export function ChapterList({
  slug,
  chapters,
}: {
  slug: string;
  chapters: ChapterInfo[];
}) {
  const [newestFirst, setNewestFirst] = useState(true);
  const [shown, setShown] = useState(FIRST_PAGE);
  const current = useAllProgress()[slug]?.chapter;
  const list = newestFirst ? [...chapters].reverse() : chapters;

  return (
    <>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          Bölümler <span className="text-base font-medium text-muted">({chapters.length})</span>
        </h2>
        {chapters.length > 1 && (
          <button
            onClick={() => {
              setNewestFirst((v) => !v);
              setShown(FIRST_PAGE);
            }}
            className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-muted hover:text-fg"
          >
            <SortIcon size={14} />
            {newestFirst ? "En yeni" : "En eski"}
          </button>
        )}
      </div>
      {list.length === 0 ? (
        <p className="panel p-6 text-muted">Bu serinin ilk bölümü yakında eklenecek.</p>
      ) : (
        <ol className="grid gap-2 sm:grid-cols-2">
          {list.map((c, i) => {
            const isCurrent = c.number === current;
            const read = current !== undefined && c.number < current;
            return (
              <li key={c.number} hidden={i >= shown}>
                <Link
                  href={`/seri/${slug}/bolum/${c.number}`}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 ring-1 transition-colors ${
                    isCurrent
                      ? "bg-accent/10 ring-accent/40 hover:bg-accent/15"
                      : "bg-white/[0.03] ring-white/[0.06] hover:bg-white/[0.06] hover:ring-white/15"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`flex items-center gap-2 font-semibold ${read ? "text-muted" : ""}`}>
                      Bölüm {c.number}
                      <NewBadge iso={c.publishedAt} />
                      {isCurrent && <span className="text-[11px] font-bold text-accent">Kaldığın yer</span>}
                    </span>
                    <span className="block truncate text-sm text-muted">{c.title}</span>
                  </span>
                  {read ? (
                    <CheckIcon size={16} className="shrink-0 text-muted" aria-label="Okundu" />
                  ) : (
                    <TimeAgo iso={c.publishedAt} className="shrink-0 text-xs text-muted" />
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
      {list.length > shown && (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setShown((n) => n + STEP)} className="btn-ghost flex-1 text-sm">
            Daha fazla göster ({list.length - shown} bölüm daha)
          </button>
          {list.length - shown > STEP && (
            <button type="button" onClick={() => setShown(list.length)} className="btn-ghost text-sm">
              Tümü
            </button>
          )}
        </div>
      )}
    </>
  );
}
