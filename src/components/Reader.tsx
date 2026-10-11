"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { saveProgress } from "@/lib/progress";

/** Bölüm açılışını sayaca bildirir; aynı tarayıcıdan aynı bölüm günde bir kez sayılır. */
function useCountView(slug: string, chapter: number) {
  useEffect(() => {
    const key = `webtooku:view:${slug}:${chapter}:${new Date().toISOString().slice(0, 10)}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      return;
    }
    fetch("/api/goruntulenme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      keepalive: true,
    }).catch(() => {});
  }, [slug, chapter]);
}

type Mode = "dikey" | "sayfa";
const MODE_KEY = "mangaoku:mode";
const modeListeners = new Set<() => void>();

function useReaderMode() {
  const mode = useSyncExternalStore<Mode>(
    (cb) => {
      modeListeners.add(cb);
      return () => modeListeners.delete(cb);
    },
    () => (localStorage.getItem(MODE_KEY) === "sayfa" ? "sayfa" : "dikey"),
    () => "dikey",
  );
  const setMode = (m: Mode) => {
    localStorage.setItem(MODE_KEY, m);
    modeListeners.forEach((cb) => cb());
  };
  return [mode, setMode] as const;
}

type Props = {
  slug: string;
  seriesTitle: string;
  chapter: number;
  chapterTitle: string;
  pages: string[];
  chapterNumbers: number[];
  prev: number | null;
  next: number | null;
};

export function Reader(props: Props) {
  const { slug, seriesTitle, chapter, chapterTitle, pages, chapterNumbers, prev, next } = props;
  const router = useRouter();
  const [mode, setMode] = useReaderMode();
  const [page, setPage] = useState(0); // 0 tabanlı
  useCountView(slug, chapter);
  const chapterUrl = (n: number) => `/seri/${slug}/bolum/${n}`;

  useEffect(() => {
    saveProgress(slug, chapter, page + 1);
  }, [slug, chapter, page]);

  const goNext = useCallback(() => {
    if (page < pages.length - 1) setPage(page + 1);
    else if (next !== null) router.push(chapterUrl(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pages.length, next, router]);

  const goPrev = useCallback(() => {
    if (page > 0) setPage(page - 1);
    else if (prev !== null) router.push(chapterUrl(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, prev, router]);

  // Sayfa modunda klavye ile gezinme
  useEffect(() => {
    if (mode !== "sayfa") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "d") goNext();
      if (e.key === "ArrowLeft" || e.key === "a") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, goNext, goPrev]);

  // Sayfa modunda sayfa değişince başa kaydır
  useEffect(() => {
    if (mode === "sayfa") window.scrollTo({ top: 0 });
  }, [mode, page]);

  const progress = ((page + 1) / pages.length) * 100;

  const chapterNav = (
    <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-6">
      <NavButton href={prev !== null ? chapterUrl(prev) : null}>Önceki bölüm</NavButton>
      <select
        aria-label="Bölüm seç"
        value={chapter}
        onChange={(e) => router.push(chapterUrl(Number(e.target.value)))}
        className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
      >
        {chapterNumbers.map((n) => (
          <option key={n} value={n}>
            {n}. bölüm
          </option>
        ))}
      </select>
      <NavButton href={next !== null ? chapterUrl(next) : null}>Sonraki bölüm</NavButton>
    </div>
  );

  return (
    <div className="bg-bg">
      <div className="sticky top-16 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <Link href={`/seri/${slug}`} className="block truncate font-semibold hover:text-accent">
              {seriesTitle}
            </Link>
            <p className="truncate text-xs text-muted">
              {chapter}. bölüm: {chapterTitle}
            </p>
          </div>
          <div role="group" aria-label="Okuma modu" className="flex shrink-0 overflow-hidden rounded-lg border border-line text-xs">
            {(["dikey", "sayfa"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`px-3 py-1.5 font-semibold ${mode === m ? "bg-accent text-white" : "text-muted hover:text-fg"}`}
              >
                {m === "dikey" ? "Dikey" : "Sayfa sayfa"}
              </button>
            ))}
          </div>
        </div>
        {/* Bölüm içindeki ilerleme */}
        <div className="h-0.5 bg-line" aria-hidden>
          <div className="h-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {mode === "dikey" ? (
        <VerticalPages pages={pages} onVisible={setPage} />
      ) : (
        <div className="mx-auto max-w-3xl px-2 pt-4">
          <div className="relative select-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pages[page]} alt={`Sayfa ${page + 1}`} className="mx-auto w-full" />
            {/* Sol üçte bire tıklayınca geri, kalanına tıklayınca ileri */}
            <button aria-label="Önceki sayfa" onClick={goPrev} className="absolute inset-y-0 left-0 w-1/3" />
            <button aria-label="Sonraki sayfa" onClick={goNext} className="absolute inset-y-0 right-0 w-2/3" />
          </div>
          {/* Sonraki sayfayı önceden yükle */}
          {pages[page + 1] && <link rel="preload" as="image" href={pages[page + 1]} />}
          <p className="py-3 text-center text-sm text-muted">
            Sayfa {page + 1} / {pages.length}. Ok tuşlarıyla da gezinebilirsin.
          </p>
        </div>
      )}

      {chapterNav}
    </div>
  );
}

function VerticalPages({ pages, onVisible }: { pages: string[]; onVisible: (i: number) => void }) {
  const refs = useRef<(HTMLImageElement | null)[]>([]);

  // Ekranda görünen sayfayı okuma geçmişine yaz
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) onVisible(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [pages, onVisible]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      {pages.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          ref={(el) => {
            refs.current[i] = el;
          }}
          data-index={i}
          src={src}
          alt={`Sayfa ${i + 1}`}
          loading={i < 2 ? "eager" : "lazy"}
          className="w-full"
        />
      ))}
    </div>
  );
}

function NavButton({ href, children }: { href: string | null; children: React.ReactNode }) {
  const cls = "rounded-lg px-4 py-2 text-sm font-semibold";
  if (!href) return <span className={`${cls} bg-surface text-muted/50`}>{children}</span>;
  return (
    <Link href={href} className={`${cls} bg-surface-2 hover:bg-accent hover:text-white`}>
      {children}
    </Link>
  );
}
