import { Suspense } from "react";
import { AddFansubForm, FansubItem } from "@/components/admin/FansubManager";
import { requireAdmin } from "@/lib/auth";
import { getFansubList } from "@/lib/fansubs";

export const metadata = { title: "Kaynaklar" };

// Tablolar veritabanında yoksa panel bu SQL'i gösterir (npm run db:push ile aynı sonuç)
const CREATE_TABLES_SQL = `CREATE TABLE IF NOT EXISTS "fansubs" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "url" text,
  "logo" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "fansubs_name_unique" UNIQUE("name"),
  CONSTRAINT "fansubs_slug_unique" UNIQUE("slug")
);
CREATE TABLE IF NOT EXISTS "series_fansubs" (
  "series_id" integer PRIMARY KEY NOT NULL
    REFERENCES "public"."series"("id") ON DELETE cascade,
  "fansub_id" integer NOT NULL
    REFERENCES "public"."fansubs"("id") ON DELETE cascade,
  "url" text
);`;

export default function SourcesPage() {
  return (
    <Suspense fallback={<p>Yükleniyor…</p>}>
      <Sources />
    </Suspense>
  );
}

async function Sources() {
  await requireAdmin();
  const list = await getFansubList();

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-3xl font-extrabold">Çeviri kaynakları</h1>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Başka ekiplerden alınan çeviriler için. Seri formunda kaynak seçilirse seri sayfasında &quot;Bu çeviri X
          üzerinden alınmıştır&quot; kutusu görünür. Kendi çevirilerinde kaynak seçme.
        </p>
      </div>

      {list === null ? (
        <div className="rounded-2xl border border-accent/40 bg-surface p-5">
          <p className="font-semibold">Kaynak tabloları veritabanında henüz yok.</p>
          <p className="mt-1 text-sm text-muted">
            Neon → SQL Editor&apos;de şunu çalıştır (ya da bilgisayarında <code>npm run db:push</code>), sonra bu sayfayı
            yenile:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-bg p-4 text-xs">{CREATE_TABLES_SQL}</pre>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-4 text-lg font-bold">Yeni kaynak</h2>
            <AddFansubForm />
          </section>
          {list.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-bold">Liste ({list.length})</h2>
              <ul className="border-t border-line">
                {list.map((f) => (
                  <FansubItem key={f.id} fansub={f} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
