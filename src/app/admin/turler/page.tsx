import { Suspense } from "react";
import { AddGenreForm, GenreItem, UnlistedGenres } from "@/components/admin/GenreManager";
import { requireAdmin } from "@/lib/auth";
import { getGenreList, getUnlistedGenres } from "@/lib/genres";

export const metadata = { title: "Türler" };

// `genres` tablosu veritabanında yoksa panel bu SQL'i gösterir (npm run db:push ile aynı sonuç)
const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS "genres" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "genres_name_unique" UNIQUE("name"),
  CONSTRAINT "genres_slug_unique" UNIQUE("slug")
);`;

export default function GenresPage() {
  return (
    <Suspense fallback={<p>Yükleniyor…</p>}>
      <Genres />
    </Suspense>
  );
}

async function Genres() {
  await requireAdmin();
  const [list, unlisted] = await Promise.all([getGenreList(), getUnlistedGenres()]);

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-3xl font-extrabold">Türler</h1>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Seri formunda seçilebilen türler. Bir türün adı değişirse ya da silinirse onu kullanan tüm seriler de
          güncellenir.
        </p>
      </div>

      {list === null ? (
        <div className="rounded-2xl border border-accent/40 bg-surface p-5">
          <p className="font-semibold">Türler tablosu veritabanında henüz yok.</p>
          <p className="mt-1 text-sm text-muted">
            Neon → SQL Editor&apos;de şunu çalıştır (ya da bilgisayarında <code>npm run db:push</code>), sonra bu sayfayı
            yenile:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-bg p-4 text-xs">{CREATE_TABLE_SQL}</pre>
        </div>
      ) : (
        <>
          <AddGenreForm />
          {unlisted.length > 0 && <UnlistedGenres items={unlisted} />}
          {list.length === 0 ? (
            <p className="text-muted">Listede henüz tür yok.</p>
          ) : (
            <section>
              <h2 className="mb-2 text-lg font-bold">Liste ({list.length})</h2>
              <ul className="border-t border-line">
                {list.map((g) => (
                  <GenreItem key={g.id} genre={g} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
