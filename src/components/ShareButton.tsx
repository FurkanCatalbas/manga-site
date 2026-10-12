"use client";

// Paylaş düğmesi. Telefonda sistemin paylaşım ekranı (WhatsApp, Instagram, Discord…) açılır;
// masaüstünde WhatsApp, X, Telegram ve bağlantıyı kopyalama seçenekleri.
import { useEffect, useRef, useState } from "react";
import { CheckIcon, ShareIcon } from "@/components/icons";

export function ShareButton({ url, title, className = "" }: { url: string; title: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
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

  async function share() {
    // Dokunmatik cihazlarda sistemin paylaşım ekranı; masaüstünde kendi menümüz daha kullanışlı
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Kullanıcı vazgeçti
      }
      return;
    }
    setOpen((v) => !v);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Pano izni yoksa adres seçilebilir kalsın
      prompt("Bağlantıyı kopyala:", url);
    }
  }

  const text = encodeURIComponent(`${title} ${url}`);
  const targets = [
    { label: "WhatsApp", href: `https://wa.me/?text=${text}` },
    { label: "X", href: `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` },
  ];

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={share} aria-expanded={open} className={`btn-ghost ${className}`}>
        <ShareIcon size={16} />
        Paylaş
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-52 rounded-2xl bg-surface p-1.5 shadow-2xl ring-1 shadow-black/60 ring-white/10">
          {targets.map((t) => (
            <a
              key={t.label}
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-semibold hover:bg-white/[0.06]"
            >
              {t.label}
            </a>
          ))}
          <button
            type="button"
            onClick={copy}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-white/[0.06]"
          >
            {copied ? (
              <>
                <CheckIcon size={15} className="text-fresh" />
                Kopyalandı
              </>
            ) : (
              "Bağlantıyı kopyala"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
