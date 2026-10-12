import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChapterUploader } from "@/components/admin/ChapterUploader";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { SeriesForm } from "@/components/admin/SeriesForm";
import { db } from "@/db";
import { chapters, series } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getGenreList } from "@/lib/genres";
import { formatDate } from "@/lib/series";
import { deleteChapter, deleteSeries } from "../../actions";

export const metadata = { title: "Seriyi düzenle" };

export default function EditSeriesPage(props: PageProps<"/admin/seri/[slug]">) {
  return (
    <Suspense fallback={<p>Yükleniyor…</p>}>
      <EditSeries params={props.params} />
    </Suspense>
  );
}

async function EditSeries({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const [s, genreList] = await Promise.all([
    db.query.series.findFirst({
      where: eq(series.slug, slug),
      with: { chapters: { orderBy: asc(chapters.number) } },
    }),
    getGenreList(),
  ]);
  if (!s) notFound();

  const nextNumber = (s.chapters.at(-1)?.number ?? 0) + 1;

  return (
    <div className="grid gap-14">
      <section>
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-3xl font-extrabold">{s.title}</h1>
          <Link href={`/seri/${s.slug}`} className="text-sm font-semibold underline underline-offset-4">
            Sitede gör
          </Link>
        </div>
        <SeriesForm
          allGenres={(genreList ?? []).map((g) => g.name)}
          initial={{
            slug: s.slug,
            title: s.title,
            author: s.author,
            description: s.description,
            genres: s.genres,
            status: s.status,
            cover: s.cover,
          }}
        />
      </section>

      <section>
        <h2 className="mb-5 text-2xl font-bold">Yeni bölüm ekle</h2>
        <ChapterUploader key={nextNumber} slug={s.slug} nextNumber={nextNumber} />
      </section>

      <section>
        <h2 className="mb-5 text-2xl font-bold">Bölümler</h2>
        {s.chapters.length === 0 ? (
          <p>Bu seride henüz bölüm yok.</p>
        ) : (
          <ol className="border-t border-line">
            {[...s.chapters].reverse().map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-4 border-b border-line py-3">
                <span className="w-12 text-right text-2xl font-bold text-muted">{c.number}</span>
                <Link href={`/seri/${s.slug}/bolum/${c.number}`} className="flex-1 font-semibold hover:text-accent">
                  {c.title}
                </Link>
                <span className="text-sm text-muted">
                  {c.pages.length} sayfa, {formatDate(c.publishedAt.toISOString())}
                </span>
                <ConfirmButton action={deleteChapter.bind(null, s.slug, c.number)}>Sil</ConfirmButton>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-xl font-bold">Seriyi sil</h2>
        <p className="mt-2 max-w-prose text-sm">
          Seri, tüm bölümleri ve R2&apos;deki tüm görselleriyle birlikte kalıcı olarak silinir. Bu işlem geri alınamaz.
        </p>
        <div className="mt-4">
          <ConfirmButton action={deleteSeries.bind(null, s.slug)} confirmText="Evet, seriyi tamamen sil">
            Seriyi sil
          </ConfirmButton>
        </div>
      </section>
    </div>
  );
}
