import Link from "next/link";
import { bridgeSvg, O_GAP } from "@/lib/brand";

/** İki "o" arasındaki gözlük köprüsü (çizim src/lib/brand.ts'de). */
function GlassesBridge({ id }: { id: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0"
      dangerouslySetInnerHTML={{ __html: bridgeSvg(id) }}
    />
  );
}

/**
 * Yazı logosu: webt + beyaz "o" + mor "o" + ku. Ortadaki "oo" köprüyle gözlüğe dönüşür;
 * sol cam `webto`'nun, sağ cam `oku`'nun "o"su (bkz. src/lib/brand.ts).
 */
export function Wordmark({ className = "", id = "wm" }: { className?: string; id?: string }) {
  return (
    <span className={`inline-flex font-display leading-none tracking-tight ${className}`}>
      webt
      <span className="relative inline-flex">
        <span style={{ marginRight: `${O_GAP}em` }}>o</span>
        <span className="text-accent-2">o</span>
        <GlassesBridge id={id} />
      </span>
      <span className="text-gradient-rev">ku</span>
    </span>
  );
}

export function Logo({ id = "logo" }: { id?: string }) {
  return (
    <Link href="/" aria-label="webtooku ana sayfa" className="flex items-center">
      <Wordmark className="text-[1.4rem]" id={id} />
    </Link>
  );
}
