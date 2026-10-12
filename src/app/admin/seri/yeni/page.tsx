import { Suspense } from "react";
import { SeriesForm } from "@/components/admin/SeriesForm";
import { requireAdmin } from "@/lib/auth";
import { getFansubList } from "@/lib/fansubs";
import { getGenreList } from "@/lib/genres";
import { ALT_TITLES_SQL, hasAltTitles } from "@/lib/schema-check";

export const metadata = { title: "Yeni seri" };

export default function NewSeriesPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-extrabold">Yeni seri</h1>
      <Suspense fallback={<p>Yükleniyor…</p>}>
        <Guarded />
      </Suspense>
    </div>
  );
}

async function Guarded() {
  await requireAdmin();
  const [genres, sources, alt] = await Promise.all([getGenreList(), getFansubList(), hasAltTitles()]);
  return (
    <SeriesForm
      allGenres={(genres ?? []).map((g) => g.name)}
      sources={sources && sources.map((f) => ({ id: f.id, name: f.name }))}
      altTitlesSql={alt ? undefined : ALT_TITLES_SQL}
    />
  );
}
