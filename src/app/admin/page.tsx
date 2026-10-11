import { asc } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { primaryBtn } from "@/components/admin/ui";
import { db } from "@/db";
import { chapters, series } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Seriler" };

export default function AdminHome() {
  return (
    <Suspense fallback={<p>Yükleniyor…</p>}>
      <SeriesList />
    </Suspense>
  );
}

async function SeriesList() {
  await requireAdmin();
  const rows = await db.query.series.findMany({
    orderBy: asc(series.title),
    with: { chapters: { columns: { number: true }, orderBy: asc(chapters.number) } },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold">Seriler</h1>
        <Link href="/admin/seri/yeni" className={primaryBtn}>
          Yeni seri ekle
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8">Henüz seri yok. İlk seriyi ekleyerek başla.</p>
      ) : (
        <ul className="mt-6 border-t border-line">
          {rows.map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/seri/${s.slug}`}
                className="flex items-center gap-4 border-b border-line py-3 hover:bg-surface"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.cover} alt="" className="h-16 w-11 shrink-0 rounded-md object-cover" />
                <span className="flex-1 font-semibold">{s.title}</span>
                <span className="pr-3 text-sm text-muted">
                  {s.chapters.length} bölüm, {s.status.toLocaleLowerCase("tr")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
