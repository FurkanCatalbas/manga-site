"use client";

// Uzun seri açıklaması 3 satırda kısalır; "Devamını göster" ile açılır. Metnin tamamı HTML'de kalır (SEO).
import { useState } from "react";
import { ChevronDownIcon } from "@/components/icons";

const LONG = 220; // bu uzunluktan kısa açıklamalarda düğme gösterilmez

export function Description({ text, className = "" }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > LONG;
  return (
    <div className={className}>
      <p className={`max-w-prose leading-relaxed whitespace-pre-line text-fg/80 ${long && !open ? "line-clamp-3" : ""}`}>{text}</p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-1.5 flex items-center gap-1 text-sm font-semibold text-muted hover:text-fg"
        >
          {open ? "Açıklamayı gizle" : "Devamını göster"}
          <ChevronDownIcon size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}
