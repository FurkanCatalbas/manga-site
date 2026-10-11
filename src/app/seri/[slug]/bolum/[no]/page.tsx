import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Reader } from "@/components/Reader";
import { getAllSeries, getChapter } from "@/lib/data";

export async function generateStaticParams() {
  return (await getAllSeries()).flatMap((s) =>
    s.chapters.map((c) => ({ slug: s.slug, no: String(c.number) })),
  );
}

export async function generateMetadata(
  props: PageProps<"/seri/[slug]/bolum/[no]">,
): Promise<Metadata> {
  const { slug, no } = await props.params;
  const found = await getChapter(slug, Number(no));
  return found ? { title: `${found.series.title} – Bölüm ${found.chapter.number}` } : {};
}

export default async function ChapterPage(props: PageProps<"/seri/[slug]/bolum/[no]">) {
  const { slug, no } = await props.params;
  const found = await getChapter(slug, Number(no));
  if (!found) notFound();

  const { series, chapter } = found;
  const numbers = series.chapters.map((c) => c.number);
  const idx = numbers.indexOf(chapter.number);

  return (
    <Reader
      key={chapter.number}
      slug={series.slug}
      seriesTitle={series.title}
      chapter={chapter.number}
      chapterTitle={chapter.title}
      pages={chapter.pages}
      chapterNumbers={numbers}
      prev={numbers[idx - 1] ?? null}
      next={numbers[idx + 1] ?? null}
    />
  );
}
