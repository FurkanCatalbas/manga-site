"use client";

// Masaüstü başlığındaki "Türler" açılır menüsü. Dışarı tıklayınca, Esc'ye basınca ya da bir türe
// gidince kapanır. Mobilde türler Keşfet'te ve altbilgide.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/icons";

export function GenreMenu({ genres }: { genres: { name: string; slug: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (genres.length === 0) return null;

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="genre-menu"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${open ? "bg-white/10 text-fg" : "text-muted hover:text-fg"}`}
      >
        Türler
        <ChevronDownIcon size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          id="genre-menu"
          className="absolute top-full left-0 z-40 mt-3 w-[min(30rem,calc(100vw-2rem))] rounded-2xl bg-surface p-4 shadow-2xl ring-1 shadow-black/60 ring-white/10"
        >
          <div className="mb-3 flex items-center justify-between gap-4">
            <span className="text-xs font-bold tracking-wider text-muted uppercase">Türler</span>
            <Link
              href="/tur"
              onClick={() => setOpen(false)}
              className="flex items-center gap-0.5 text-sm font-semibold text-accent hover:text-fg"
            >
              Tümü
              <ChevronRightIcon size={15} />
            </Link>
          </div>
          <ul className="grid grid-cols-3 gap-1">
            {genres.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/tur/${g.slug}`}
                  onClick={() => setOpen(false)}
                  className="block truncate rounded-lg px-2.5 py-1.5 text-sm text-fg/85 transition-colors hover:bg-white/[0.06] hover:text-fg"
                >
                  {g.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
