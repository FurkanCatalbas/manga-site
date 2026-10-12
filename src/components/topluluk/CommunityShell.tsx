// Topluluk sayfalarının (forum, sohbet, listeler) ortak başlığı ve alt gezinmesi.
import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";

const TABS = [
  { href: "/topluluk", label: "Genel bakış" },
  { href: "/forum", label: "Forum" },
  { href: "/sohbet", label: "Sohbet" },
  { href: "/listeler", label: "Listeler" },
];

export function CommunityTabs({ active }: { active: string }) {
  return (
    <nav aria-label="Topluluk" className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={active === t.href ? "page" : undefined}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition-colors ${
            active === t.href ? "bg-fg text-bg ring-fg" : "bg-white/[0.04] text-fg/80 ring-white/[0.08] hover:bg-white/[0.08]"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Konum" className="mb-3 flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted">
      {items.map((it, i) => (
        <span key={i} className="flex min-w-0 items-center gap-1">
          {i > 0 && <ChevronRightIcon size={14} className="shrink-0" />}
          {it.href ? (
            <Link href={it.href} className="truncate hover:text-fg">{it.label}</Link>
          ) : (
            <span className="truncate text-fg/80">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Soon({ what }: { what: string }) {
  return <p className="panel p-6 text-center text-muted">{what} çok yakında açılıyor.</p>;
}
