import { ExternalLinkIcon } from "@/components/icons";
import type { SeriesSource } from "@/lib/fansubs";

/**
 * Başka ekipten alınan çeviriler için kaynak notu:
 * "Bu çeviri X (x.com) üzerinden alınmıştır. Ekibi desteklemek için seriyi kendi sitesinden oku."
 */
export function SourceNotice({ source, compact = false }: { source: SeriesSource; compact?: boolean }) {
  const name = <strong className="font-semibold text-fg">{source.name}</strong>;
  const domain = source.domain && <span className="text-muted"> ({source.domain})</span>;

  if (compact) {
    // Okuyucuda bölüm sonu: tek satırlık not
    return (
      <p className="text-center text-xs text-muted">
        Bu çeviri {source.link ? (
          <a href={source.link} target="_blank" rel="nofollow noopener" className="underline-offset-2 hover:underline">
            {name}
            {domain}
          </a>
        ) : (
          <>
            {name}
            {domain}
          </>
        )}{" "}
        üzerinden alınmıştır.
      </p>
    );
  }

  return (
    <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/[0.08]">
      {source.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={source.logo} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
      ) : (
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 font-bold text-muted">
          {source.name.charAt(0).toLocaleUpperCase("tr")}
        </span>
      )}
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-fg/80 sm:text-sm">
        Bu çeviri {name}
        {domain} üzerinden alınmıştır.
        {source.link && (
          <>
            {/* Dar ekranda kutu kısa kalsın diye kısa metin */}
            <span className="hidden sm:inline"> Ekibi desteklemek için seriyi kendi sitesinden oku.</span>
            <span className="sm:hidden"> Ekibi sitesinde destekle.</span>
          </>
        )}
      </p>
      {source.link && (
        <a
          href={source.link}
          target="_blank"
          rel="nofollow noopener"
          aria-label={`${source.name} sitesinde aç`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-fresh ring-1 ring-fresh/40 transition-colors hover:bg-fresh/10"
        >
          <ExternalLinkIcon size={18} />
        </a>
      )}
    </div>
  );
}
