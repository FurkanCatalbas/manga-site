"use client";

// Seri puanı: ortalama, dağılım ve kullanıcının kendi puanı (5 yıldız = 10 üzerinden, her yıldız 2 puan).
import Link from "next/link";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/hesap-client";
import type { RatingSummary } from "@/lib/puan";
import { myRating, rateSeries } from "@/lib/puan-actions";

const LABELS = ["", "Berbat", "Çok kötü", "Kötü", "Vasat", "Fena değil", "İdare eder", "İyi", "Çok iyi", "Harika", "Başyapıt"];

function Star({ fill, size = 28 }: { fill: number; size?: number }) {
  // fill: 0–1 arası doluluk
  const id = `y${Math.round(fill * 100)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="#fbbf24" />
          <stop offset={`${fill * 100}%`} stopColor="rgb(255 255 255 / 0.14)" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L2.9 9.4l6.3-.9z"
      />
    </svg>
  );
}

/** Ortalamayı yıldızla gösterir (10 üzerinden puanı 5 yıldıza böler). */
export function Stars({ score, size = 18 }: { score: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`10 üzerinden ${score}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={size} fill={Math.max(0, Math.min(1, (score - i * 2) / 2))} />
      ))}
    </span>
  );
}

export function RatingPanel({ slug, initial, loginHref }: { slug: string; initial: RatingSummary; loginHref: string }) {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const [summary, setSummary] = useState(initial);
  const [mine, setMine] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    myRating(slug).then((s) => {
      if (!cancelled) setMine(s);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, slug]);

  async function rate(score: number | null) {
    const prev = mine;
    setError(undefined);
    setMine(score);
    // Ortalamayı hemen güncelle
    setSummary((s) => {
      const dist = [...s.dist];
      if (prev) dist[prev - 1] -= 1;
      if (score) dist[score - 1] += 1;
      const count = dist.reduce((a, b) => a + b, 0);
      const avg = count ? Math.round((dist.reduce((a, n, i) => a + n * (i + 1), 0) / count) * 10) / 10 : 0;
      return { avg, count, dist };
    });
    const res = await rateSeries(slug, score);
    if (!res.ok) {
      setError(res.error);
      setMine(prev);
      setSummary(initial);
    }
  }

  const shown = hover ?? mine ?? 0;
  const max = Math.max(1, ...summary.dist);

  return (
    <section aria-label="Puan" className="panel grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:gap-8">
      <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-1">
        <p className="font-display text-5xl leading-none tracking-tight">{summary.count ? summary.avg.toFixed(1) : "–"}</p>
        <div>
          <Stars score={summary.avg} />
          <p className="mt-1 text-xs text-muted">{summary.count ? `${summary.count} puan` : "Henüz puan yok"}</p>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Dağılım: 10'dan 1'e, ikişer gruplanmış (5 yıldız) */}
        <ul className="grid gap-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const n = summary.dist[star * 2 - 1] + summary.dist[star * 2 - 2];
            return (
              <li key={star} className="flex items-center gap-2 text-xs text-muted">
                <span className="w-3 text-right">{star}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <span className="block h-full rounded-full bg-amber-400/80" style={{ width: `${(n / max) * 100}%` }} />
                </span>
                <span className="w-6 text-right">{n}</span>
              </li>
            );
          })}
        </ul>

        <div>
          <p className="mb-1.5 text-sm font-semibold">
            {mine ? "Puanın" : "Sen ne düşünüyorsun?"}
            {shown > 0 && <span className="ml-2 font-normal text-muted">{shown}/10 · {LABELS[shown]}</span>}
          </p>
          {session ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex" onMouseLeave={() => setHover(null)} role="radiogroup" aria-label="Puan ver">
                {[1, 2, 3, 4, 5].map((star) => {
                  // Yıldızın sol yarısı tek, sağ yarısı çift puan (ör. 3. yıldız: 5 ya da 6)
                  return (
                    <span key={star} className="relative">
                      <Star size={34} fill={Math.max(0, Math.min(1, (shown - (star - 1) * 2) / 2))} />
                      {[star * 2 - 1, star * 2].map((v, half) => (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={mine === v}
                          aria-label={`${v} puan: ${LABELS[v]}`}
                          onMouseEnter={() => setHover(v)}
                          onFocus={() => setHover(v)}
                          onBlur={() => setHover(null)}
                          onClick={() => rate(mine === v ? null : v)}
                          className={`absolute top-0 h-full w-1/2 ${half ? "right-0" : "left-0"}`}
                        />
                      ))}
                    </span>
                  );
                })}
              </div>
              {mine && (
                <button type="button" onClick={() => rate(null)} className="text-xs font-semibold text-muted hover:text-fg">
                  Puanı kaldır
                </button>
              )}
            </div>
          ) : (
            <Link href={loginHref} className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-fg">
              <Stars score={0} size={22} /> Puan vermek için giriş yap
            </Link>
          )}
          {error && <p role="alert" className="mt-2 text-sm font-semibold text-accent">{error}</p>}
        </div>
      </div>
    </section>
  );
}
