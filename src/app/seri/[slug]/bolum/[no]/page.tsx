import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Reader } from "@/components/Reader";
import { JsonLd } from "@/components/JsonLd";
import { getAllSeries, getChapter } from "@/lib/data";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

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
  if (!found) return {};
  const { series, chapter } = found;
  const path = `/seri/${series.slug}/bolum/${chapter.number}`;
  const title = `${series.title} ${chapter.number}. Bölüm Oku`;
  return {
    title,
    description: `${series.title} ${chapter.number}. bölüm "${chapter.title}" ${SITE_NAME} üzerinde. ${chapter.pages.length} sayfa, hızlı ve kesintisiz oku.`,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title,
      publishedTime: chapter.publishedAt,
      images: [{ url: absoluteUrl(series.cover), alt: `${series.title} kapağı` }],
    },
  };
}

export default async function ChapterPage(props: PageProps<"/seri/[slug]/bolum/[no]">) {
  const { slug, no } = await props.params;
  const found = await getChapter(slug, Number(no));
  if (!found) notFound();

  const { series, chapter } = found;
  const numbers = series.chapters.map((c) => c.number);
  const idx = numbers.indexOf(chapter.number);
  const nextChapter = series.chapters[idx + 1];

  const seriesUrl = absoluteUrl(`/seri/${series.slug}`);
  const url = absoluteUrl(`/seri/${series.slug}/bolum/${chapter.number}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ComicIssue",
        "@id": url,
        url,
        issueNumber: chapter.number,
        name: chapter.title,
        datePublished: chapter.publishedAt,
        image: absoluteUrl(series.cover),
        inLanguage: "tr",
        isPartOf: { "@type": "ComicSeries", "@id": seriesUrl, name: series.title, url: seriesUrl },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: series.title, item: seriesUrl },
          { "@type": "ListItem", position: 3, name: `${chapter.number}. Bölüm`, item: url },
        ],
      },
    ],
  };

  return (
    <>
    <JsonLd data={jsonLd} />
    <Reader
      key={chapter.number}
      slug={series.slug}
      seriesTitle={series.title}
      chapter={chapter.number}
      chapterTitle={chapter.title}
      pages={chapter.pages}
      chapterNumbers={numbers}
      prev={numbers[idx - 1] ?? null}
      next={nextChapter?.number ?? null}
      nextPages={nextChapter?.pages.slice(0, 3) ?? []}
    />
    </>
  );
}
