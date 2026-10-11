import Link from "next/link";
import { markSvg, type MarkVariant } from "@/lib/brand";

/** Gözlük işareti. SVG metni sabit marka çiziminden gelir (kullanıcı girdisi değil). */
export function LogoMark({ size = 28, variant, id = "logo" }: { size?: number; variant?: MarkVariant; id?: string }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: markSvg({ variant, id, size }) }}
    />
  );
}

/** Yazı logosu: "webto" + vurgulu "oku" (webtoon oku). */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display leading-none tracking-tight ${className}`}>
      webto<span className="text-gradient">oku</span>
    </span>
  );
}

export function Logo({ id = "logo" }: { id?: string }) {
  return (
    <Link href="/" aria-label="webtooku ana sayfa" className="flex items-center gap-2">
      <LogoMark size={30} id={id} />
      <Wordmark className="text-xl" />
    </Link>
  );
}
