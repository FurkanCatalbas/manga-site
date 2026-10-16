import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChapterAbout } from "@/components/ChapterAbout";
import { Reader } from "@/components/Reader";
import { CommentsSection, ReactionsSection } from "@/components/topluluk/Sections";
import { JsonLd } from "@/components/JsonLd";
import { getChapter, getChapterRefs } from "@/lib/data";
import { absoluteUrl, PLACEHOLDER_SLUG, SITE_NAME, SITE_PROMISE } from "@/lib/site";

export async function generateStaticParams() {
  const params = (await getChapterRefs()).map((c) => ({ slug: c.slug, no: String(c.number) }));
  // cacheComponents boş liste kabul etmiyor (hiç bölüm yokken build kırılmasın): yer tutucu 404 verir
  return params.length ? params : [{ slug: PLACEHOLDER_SLUG, no: "0" }];
}

export async function generateMetadata(
  props: PageProps<"/seri/[slug]/bolum/[no]">,
): Promise<Metadata> {
  const { slug, no } = await props.params;
  const found = await getChapter(slug, Number(no));
  if (!found) return {};
  const { series, chapter } = found;
  const path = `/seri/${series.slug}/bolum/${chapter.number}`;
  const title = `${series.title} ${chapter.number}. Bölüm Türkçe Oku`;
  const other = series.titleAlt || series.altTitles[0];
  const named = chapter.title.toLocaleLowerCase("tr") !== `${chapter.number}. bölüm` ? ` "${chapter.title}"` : "";
  return {
    title,
    description: `${series.title}${other ? ` (${other})` : ""} ${chapter.number}. bölüm${named} Türkçe oku. ${chapter.pages.length} sayfa, ${SITE_NAME} üzerinde ${SITE_PROMISE}.`,
    keywords: [
      `${series.title} ${chapter.number}. bölüm`,
      `${series.title} ${chapter.number}. bölüm türkçe`,
      `${series.title} bölüm ${chapter.number}`,
      ...(other ? [`${other} ${chapter.number}. bölüm`] : []),
      `${series.title} türkçe oku`,
    ],
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title,
      publishedTime: chapter.publishedAt,
      // Kapaklı, "N. bölüm" yazılı paylaşım görseli (src/app/paylasim)
      images: [{ url: `/paylasim/${series.slug}/${chapter.number}`, width: 1200, height: 630, alt: `${series.title} ${chapter.number}. bölüm` }],
    },
  };
}

export default async function ChapterPage(props: PageProps<"/seri/[slug]/bolum/[no]">) {
  const { slug, no } = await props.params;
  const found = await getChapter(slug, Number(no));
  if (!found) notFound();

  const { series, chapter, nextPages } = found;
  const numbers = series.chapters.map((c) => c.number);
  const idx = numbers.indexOf(chapter.number);

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
        isAccessibleForFree: true,
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
      next={numbers[idx + 1] ?? null}
      nextPages={nextPages}
    >
      <div className="mx-auto grid max-w-3xl gap-12 px-4 pt-4 pb-12">
        <ReactionsSection slug={series.slug} chapter={chapter.number} />
        <CommentsSection slug={series.slug} chapter={chapter.number} preview={3} />
      </div>
      <ChapterAbout series={series} chapter={chapter.number} pageCount={chapter.pages.length} />
    </Reader>
    </>
  );
}
