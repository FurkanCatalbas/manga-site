"use client";

// Okuma geçmişinden (localStorage) beslenen bölümler: ana sayfadaki "Okumaya devam et" rafı
// ve Kütüphane sayfası. Hesap sistemi gelince veri kaynağı sunucuya taşınacak.
import Link from "next/link";
import { CompassIcon, PlayIcon } from "@/components/icons";
import { SectionHeader } from "@/components/SeriesCard";
import { useAllProgress, type Progress } from "@/lib/progress";
import type { LibraryItem } from "@/lib/series";


type Entry = LibraryItem & { progress: Progress; unread: number };

function useEntries(items: LibraryItem[]): Entry[] {
  const store = useAllProgress();
  return items
    .flatMap((it) => {
      const progress = store[it.slug];
      if (!progress) return [];
      return [{ ...it, progress, unread: Math.max(0, (it.latest ?? 0) - progress.chapter) }];
    })
    .sort((a, b) => b.progress.updatedAt - a.progress.updatedAt);
}

const chapterUrl = (e: Entry) => `/seri/${e.slug}/bolum/${e.progress.chapter}`;
const percent = (e: Entry) => (e.latest ? Math.min(100, Math.round((e.progress.chapter / e.latest) * 100)) : 0);

/** Ana sayfada yatay kayan raf; okuma geçmişi yoksa hiç görünmez. */
export function ContinueShelf({ items }: { items: LibraryItem[] }) {
  const entries = useEntries(items).slice(0, 12);
  if (entries.length === 0) return null;

  return (
    <section className="mt-10">
      <SectionHeader title="Okumaya devam et" href="/kutuphane" linkLabel="Kütüphane" />
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {entries.map((e) => (
          <li key={e.slug} className="w-32 shrink-0 snap-start sm:w-36">
            <Link href={chapterUrl(e)} className="group block">
              <div className="relative overflow-hidden rounded-xl ring-1 ring-white/[0.08]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.cover} alt="" loading="lazy" className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <span className="absolute inset-0 m-auto grid h-10 w-10 place-items-center rounded-full bg-white/90 text-bg opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  <PlayIcon size={16} />
                </span>
                <div className="absolute inset-x-2 bottom-2">
                  <p className="text-xs font-bold">Bölüm {e.progress.chapter}</p>
                  {/* Seri içindeki ilerleme */}
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${percent(e)}%` }} />
                  </div>
                </div>
              </div>
              <p className="mt-2 truncate text-sm font-semibold">{e.title}</p>
              {e.unread > 0 && <p className="text-xs font-semibold text-fresh">{e.unread} yeni bölüm</p>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Kütüphane sayfası: okunan tüm seriler, en son okunan üstte. */
export function LibraryList({ items }: { items: LibraryItem[] }) {
  const entries = useEntries(items);

  if (entries.length === 0) {
    return (
      <div className="panel flex flex-col items-center px-6 py-14 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent">
          <CompassIcon size={26} />
        </span>
        <p className="mt-4 text-lg font-bold">Kütüphanen henüz boş</p>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Okumaya başladığın seriler burada görünür; kaldığın bölümden tek dokunuşla devam edersin.
        </p>
        <Link href="/ara" className="btn-primary mt-6">
          Serileri keşfet
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {entries.map((e) => (
        <li key={e.slug} className="panel flex min-w-0 items-center gap-4 p-3">
          <Link href={`/seri/${e.slug}`} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.cover} alt="" loading="lazy" className="h-24 w-[4.5rem] rounded-xl object-cover ring-1 ring-white/10" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/seri/${e.slug}`} className="block truncate font-semibold hover:text-accent">
              {e.title}
            </Link>
            <p className="mt-0.5 text-sm text-muted">
              Bölüm {e.progress.chapter}
              {e.latest ? ` / ${e.latest}` : ""}
              {e.unread > 0 && <span className="font-semibold text-fresh"> · {e.unread} yeni</span>}
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-accent" style={{ width: `${percent(e)}%` }} />
            </div>
          </div>
          <Link href={chapterUrl(e)} aria-label={`${e.title}: devam et`} className="btn-primary h-11 w-11 shrink-0 !rounded-full !p-0">
            <PlayIcon size={16} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
