import Link from "next/link";
import type { Series } from "@/lib/series";

export function PopularList({ items }: { items: Series[] }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-lg font-bold">Popüler</h2>
      <ol className="space-y-3">
        {items.map((s, i) => (
          <li key={s.slug}>
            <Link href={`/seri/${s.slug}`} className="group flex items-center gap-3">
              <span className={`w-5 text-center text-lg font-extrabold ${i < 3 ? "text-accent" : "text-muted"}`}>
                {i + 1}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.cover} alt="" className="h-16 w-12 shrink-0 rounded-md object-cover" />
              <span className="min-w-0">
                <span className="block truncate font-semibold group-hover:text-accent">{s.title}</span>
                <span className="block truncate text-xs text-muted">{s.genres.join(", ")}</span>
                <span className="block text-xs text-muted">
                  {s.views.toLocaleString("tr-TR")} okunma
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function GenreList({ genres }: { genres: string[] }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-lg font-bold">Türler</h2>
      <div className="flex flex-wrap gap-2">
        {genres.map((g) => (
          <Link
            key={g}
            href={`/ara?tur=${encodeURIComponent(g)}`}
            className="rounded-full border border-line bg-surface-2 px-3 py-1 text-sm hover:border-accent hover:text-accent"
          >
            {g}
          </Link>
        ))}
      </div>
    </section>
  );
}
