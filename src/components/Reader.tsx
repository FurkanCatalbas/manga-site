"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import { getProgress, saveProgress, type Progress } from "@/lib/progress";
import { SourceNotice } from "@/components/SourceNotice";
import type { SeriesSource } from "@/lib/fansubs";
import type { Page } from "@/lib/series";

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
      body: JSON.stringify({ slug, chapter }),
      keepalive: true,
    }).catch(() => {});
  }, [slug, chapter]);
}

/**
 * Aşağı kaydırırken üst barları gizler, yukarı kaydırınca geri getirir.
 * Sitenin başlığı layout'ta olduğu için <html data-chrome="hidden"> ile CSS üzerinden gizlenir.
 */
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // iOS'ta en alttaki esneme yukarı kaydırma gibi görünmesin diye konum sınırlanır
    const scrollY = () =>
      Math.min(Math.max(window.scrollY, 0), document.documentElement.scrollHeight - window.innerHeight);
    let lastY = scrollY();
    const onScroll = () => {
      const y = scrollY();
      if (Math.abs(y - lastY) < 8) return;
      setHidden(y > lastY && y > 120);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (hidden) root.dataset.chrome = "hidden";
    else delete root.dataset.chrome;
    return () => {
      delete root.dataset.chrome;
    };
  }, [hidden]);

  return hidden;
}

type Props = {
  slug: string;
  seriesTitle: string;
  chapter: number;
  chapterTitle: string;
  pages: Page[];
  chapterNumbers: number[];
  prev: number | null;
  next: number | null;
  /** Sonraki bölümün ilk sayfaları, bölüm sonuna yaklaşınca önceden yüklenir */
  nextPages: Page[];
  /** Başka ekipten alınan çeviriyse kaynak notu (bölüm sonunda) */
  source?: SeriesSource | null;
};

export function Reader(props: Props) {
  const { slug, seriesTitle, chapter, chapterTitle, pages, chapterNumbers, prev, next, nextPages, source } = props;
  const router = useRouter();
  const [page, setPage] = useState(0); // 0 tabanlı
  const [resumedFrom, setResumedFrom] = useState<number | null>(null);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const hidden = useHideOnScroll();
  useCountView(slug, chapter);
  const chapterUrl = (n: number) => `/seri/${slug}/bolum/${n}`;
  const nextUrl = next !== null ? chapterUrl(next) : null;
  const closeResume = useCallback(() => setResumedFrom(null), []);

  // Kaldığın sayfaya kaydır. Kayıt, aşağıdaki saveProgress üzerine yazmadan önce okunmalı.
  // Kayıt bir kez okunur: StrictMode efekti iki kez çalıştırdığında ikinci okuma ezilmiş kaydı görürdü.
  const savedRef = useRef<Progress | null | undefined>(undefined);
  useEffect(() => {
    if (savedRef.current === undefined) savedRef.current = getProgress(slug) ?? null;
    const saved = savedRef.current;
    if (saved?.chapter !== chapter || saved.page <= 1 || saved.page > pages.length) return;
    const target = saved.page - 1;
    const imgs = imgRefs.current.slice(0, target + 1).filter((el) => el !== null);
    let cancelled = false;

    // Hedefin üstündeki sayfaların yüksekliği bilinmeden doğru yere kaydırılamaz: önce onları yükle
    Promise.all(
      imgs.map((img) => {
        img.loading = "eager";
        return img.complete
          ? null
          : new Promise((resolve) => {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            });
      }),
    ).then(() => {
      // Bu arada okuyucu kendisi kaydırmaya başladıysa karışma
      if (cancelled || window.scrollY > 50) return;
      const el = imgRefs.current[target];
      if (!el) return;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY });
      setResumedFrom(saved.page);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, chapter, pages.length]);

  useEffect(() => {
    saveProgress(slug, chapter, page + 1);
  }, [slug, chapter, page]);

  // Bölüm sonuna yaklaşınca sonraki bölümü ve ilk sayfalarını önceden yükle
  const nearEnd = page >= pages.length - 3;
  useEffect(() => {
    if (!nearEnd || !nextUrl) return;
    router.prefetch(nextUrl);
    nextPages.forEach((p) => preload(p.src, { as: "image", referrerPolicy: "no-referrer" }));
  }, [nearEnd, nextUrl, nextPages, router]);

  // Klavye: → sonraki bölüm, ← önceki bölüm (yazı alanı ya da bölüm seçicideyken değil)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable='true']")) return;
      const target = e.key === "ArrowRight" ? next : e.key === "ArrowLeft" ? prev : null;
      if (target === null) return;
      e.preventDefault();
      router.push(`/seri/${slug}/bolum/${target}`);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, router, slug]);

  const progress = ((page + 1) / pages.length) * 100;

  return (
    <div data-hide-tabbar className="bg-bg">
      {/* Gizlenince yalnızca alttaki ilerleme çizgisi (3px) ekranın üstünde kalır */}
      <div
        className="glass sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 transition-transform duration-300"
        style={hidden ? { transform: "translateY(calc(-4rem - 100% + 3px))" } : undefined}
      >
        <div className="mx-auto max-w-3xl px-4 py-2.5">
          <Link href={`/seri/${slug}`} className="block truncate font-semibold hover:text-accent">
            {seriesTitle}
          </Link>
          <p className="truncate text-xs text-muted">
            {chapter}. bölüm: {chapterTitle}
          </p>
        </div>
        {/* Bölüm içindeki ilerleme */}
        <div className="h-[3px] bg-line" aria-hidden>
          <div className="h-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <VerticalPages pages={pages} imgRefs={imgRefs} onVisible={setPage} />

      {source && (
        <div className="mx-auto max-w-3xl px-4 pt-6">
          <SourceNotice source={source} compact />
        </div>
      )}

      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-6">
        <NavButton href={prev !== null ? chapterUrl(prev) : null}>Önceki bölüm</NavButton>
        <select
          aria-label="Bölüm seç"
          value={chapter}
          onChange={(e) => router.push(chapterUrl(Number(e.target.value)))}
          className="rounded-xl border border-white/[0.08] bg-surface-2 px-3 py-2 text-sm"
        >
          {chapterNumbers.map((n) => (
            <option key={n} value={n}>
              {n}. bölüm
            </option>
          ))}
        </select>
        <NavButton href={nextUrl}>Sonraki bölüm</NavButton>
      </div>

      {nextUrl && <PullToNext href={nextUrl} />}

      {resumedFrom !== null && (
        <ResumeNotice
          page={resumedFrom}
          onRestart={() => {
            window.scrollTo({ top: 0 });
            setResumedFrom(null);
          }}
          onClose={closeResume}
        />
      )}
    </div>
  );
}

function VerticalPages({
  pages,
  imgRefs,
  onVisible,
}: {
  pages: Page[];
  imgRefs: React.RefObject<(HTMLImageElement | null)[]>;
  onVisible: (i: number) => void;
}) {
  // Ekranın ortasındaki sayfayı okuma geçmişine yaz
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) onVisible(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    imgRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [pages, imgRefs, onVisible]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      {pages.map((p, i) => (
        // Boyutlar biliniyorsa tarayıcı görsel gelmeden yerini ayırır, sayfa kaymaz.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          referrerPolicy="no-referrer"
          key={p.src}
          ref={(el) => {
            imgRefs.current[i] = el;
          }}
          data-index={i}
          src={p.src}
          width={p.width}
          height={p.height}
          alt={`Sayfa ${i + 1}`}
          loading={i < 2 ? "eager" : "lazy"}
          decoding="async"
          className="h-auto w-full"
        />
      ))}
    </div>
  );
}

const PULL_MS = 2000;
const RING = 2 * Math.PI * 10;

/**
 * Sayfanın en altında çekmeye devam edilirse (dokunmatikte parmakla yukarı sürükleme,
 * masaüstünde tekerleği aşağı çevirme) 2 saniyelik bir halka dolar; dolana kadar
 * bırakılmazsa sonraki bölüme geçilir.
 */
function PullToNext({ href }: { href: string }) {
  const router = useRouter();
  const [fill, setFill] = useState(0); // 0..1

  useEffect(() => {
    let holding = false;
    let done = false;
    let start = 0;
    let raf = 0;
    let wheelTimer: ReturnType<typeof setTimeout> | undefined;
    let touchY: number | null = null;

    const atBottom = () =>
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;

    const tick = (now: number) => {
      if (!holding) return;
      const p = Math.min((now - start) / PULL_MS, 1);
      setFill(p);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      holding = false;
      done = true;
      router.push(href);
    };
    const hold = () => {
      if (holding || done) return;
      holding = true;
      start = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const release = () => {
      if (!holding) return;
      holding = false;
      cancelAnimationFrame(raf);
      setFill(0);
    };

    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchY === null) return;
      const y = e.touches[0].clientY;
      // En alta varılana kadar başlangıç noktası parmakla birlikte kayar,
      // böylece yalnızca dipte yapılan çekme sayılır
      if (!atBottom()) {
        touchY = y;
        release();
        return;
      }
      const pulled = touchY - y;
      if (pulled > 40) hold();
      else if (pulled < 0) release();
    };
    const onTouchEnd = () => {
      touchY = null;
      release();
    };
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 0 && atBottom()) {
        hold();
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(release, 300);
      } else if (e.deltaY < 0) {
        release();
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(wheelTimer);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("wheel", onWheel);
    };
  }, [href, router]);

  return (
    <>
      <p className="px-4 pb-4 text-center text-xs text-muted">
        Sonraki bölüme geçmek için en altta çekmeye devam et.
      </p>
      {fill > 0 && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-8 z-40 mx-auto flex w-fit items-center gap-3 glass rounded-full border border-white/10 px-4 py-2.5 text-sm font-semibold shadow-lg"
        >
          <svg viewBox="0 0 24 24" className={`size-6 -rotate-90 ${fill >= 1 ? "animate-spin" : ""}`} aria-hidden>
            <circle cx="12" cy="12" r="10" fill="none" strokeWidth="3" className="stroke-line" />
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              className="stroke-accent"
              strokeDasharray={RING}
              strokeDashoffset={fill >= 1 ? RING * 0.75 : RING * (1 - fill)}
            />
          </svg>
          {fill >= 1 ? "Sonraki bölüm yükleniyor…" : "Sonraki bölüm için çekili tut"}
        </div>
      )}
    </>
  );
}

function ResumeNotice({ page, onRestart, onClose }: { page: number; onRestart: () => void; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-8 z-40 mx-auto flex w-fit items-center gap-3 glass rounded-full border border-white/10 py-2 pl-4 pr-2 text-sm shadow-lg"
    >
      <span>{page}. sayfadan devam ediyorsun</span>
      <button onClick={onRestart} className="rounded-full bg-surface-2 px-3 py-1 font-semibold hover:bg-accent hover:text-white">
        Başa dön
      </button>
    </div>
  );
}

function NavButton({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return <span className="btn-ghost !px-4 !py-2 text-sm text-muted/50">{children}</span>;
  return (
    <Link href={href} className="btn-ghost !px-4 !py-2 text-sm hover:!bg-accent hover:text-white">
      {children}
    </Link>
  );
}
