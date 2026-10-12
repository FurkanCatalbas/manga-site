// Kart ve seri sayfası rozetleri. Zamana bağlı olanlar (Yeni, alev) tarayıcıda hesaplanır (Fresh).
import { FlameIcon, SparkleIcon } from "@/components/icons";
import { Fresh } from "@/components/TimeAgo";

/** Yeni eklenen seri sayılma süresi ve "alev" için son bölümün tazeliği (gün) */
export const NEW_SERIES_DAYS = 14;
export const HOT_DAYS = 3;

/** Yalnızca webtooku'da yayınlanan seri */
export function ExclusiveBadge({ long = false }: { long?: boolean }) {
  return (
    <span
      title="Sadece webtooku'da"
      className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-accent to-accent-2 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white uppercase shadow-md shadow-accent/30"
    >
      <SparkleIcon size={11} strokeWidth={2.6} />
      {long ? "Orijinal · Sadece webtooku" : "Orijinal"}
    </span>
  );
}

/** Seri son NEW_SERIES_DAYS gün içinde eklendiyse "Yeni" */
export function NewSeriesBadge({ addedAt }: { addedAt: string }) {
  return (
    <Fresh iso={addedAt} days={NEW_SERIES_DAYS}>
      <span className="rounded-full bg-fresh px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-black uppercase shadow-md shadow-black/30">
        Yeni
      </span>
    </Fresh>
  );
}

/** Son bölüm HOT_DAYS gün içinde geldiyse alev */
export function HotBadge({ iso }: { iso?: string }) {
  return (
    <Fresh iso={iso} days={HOT_DAYS}>
      <span
        title="Yeni bölüm geldi"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-orange-400 ring-1 ring-orange-400/40 backdrop-blur-md"
      >
        <FlameIcon size={15} fill="currentColor" strokeWidth={1.4} className="drop-shadow-[0_0_6px_rgb(251_146_60/0.8)]" />
      </span>
    </Fresh>
  );
}
