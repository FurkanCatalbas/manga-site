"use client";

// Bölüm sonu tepkileri: tek dokunuşla tepki, aynısına tekrar dokununca geri alınır.
import Link from "next/link";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/hesap-client";
import type { ReactionKind, ScopeRef } from "@/lib/topluluk";
import { myReaction, react } from "@/lib/topluluk-actions";

type Option = { id: ReactionKind; emoji: string; label: string };

export function Reactions({
  refScope,
  options,
  initial,
  loginHref,
}: {
  refScope: ScopeRef;
  options: readonly Option[];
  initial: Record<ReactionKind, number>;
  loginHref: string;
}) {
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;
  const [counts, setCounts] = useState(initial);
  const [mine, setMine] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    myReaction(refScope).then((k) => {
      if (!cancelled) setMine(k);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, refScope]);

  async function choose(kind: ReactionKind) {
    const prev = mine;
    const before = counts;
    const next = prev === kind ? null : kind;
    // Hemen göster
    setMine(next);
    setCounts((c) => {
      const n = { ...c };
      if (prev) n[prev as ReactionKind] = Math.max(0, n[prev as ReactionKind] - 1);
      if (next) n[next] += 1;
      return n;
    });
    const res = await react(refScope, kind);
    if (!res.ok) {
      setError(res.error);
      setMine(prev);
      setCounts(before);
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <section aria-labelledby="tepkiler" className="text-center">
      <h2 id="tepkiler" className="text-lg font-bold tracking-tight">Bu bölüm nasıldı?</h2>
      <p className="mt-1 text-xs text-muted">{total > 0 ? `${total} tepki` : "İlk tepkiyi sen ver"}</p>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {options.map((o) => {
          const active = mine === o.id;
          const content = (
            <>
              <span className={`text-2xl transition-transform sm:text-3xl ${active ? "scale-110" : ""}`} aria-hidden>
                {o.emoji}
              </span>
              <span className="text-[11px] font-semibold sm:text-xs">{o.label}</span>
              <span className={`text-xs ${active ? "text-accent" : "text-muted"}`}>{counts[o.id]}</span>
            </>
          );
          const cls = `flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-3 ring-1 transition-colors ${
            active ? "bg-accent/10 ring-accent/50" : "bg-white/[0.03] ring-white/[0.06] hover:bg-white/[0.07]"
          }`;
          return session ? (
            <button key={o.id} type="button" onClick={() => choose(o.id)} aria-pressed={active} className={cls}>
              {content}
            </button>
          ) : (
            <Link key={o.id} href={loginHref} className={cls} aria-label={`${o.label}: tepki vermek için giriş yap`}>
              {content}
            </Link>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-accent">{error}</p>}
    </section>
  );
}
