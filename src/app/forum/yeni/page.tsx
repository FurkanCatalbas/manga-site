import type { Metadata } from "next";
import { Crumbs } from "@/components/topluluk/CommunityShell";
import { NewTopicForm } from "@/components/topluluk/ForumClient";
import { getSeriesList } from "@/lib/data";
import { FORUM_CATEGORIES } from "@/lib/forum";

export const metadata: Metadata = { title: "Yeni konu · Forum", robots: { index: false } };

export default async function NewTopicPage() {
  const series = await getSeriesList();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Crumbs items={[{ href: "/forum", label: "Forum" }, { label: "Yeni konu" }]} />
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">Yeni konu</h1>
      <NewTopicForm
        categories={FORUM_CATEGORIES.map((c) => ({ slug: c.slug, name: c.name }))}
        seriesOptions={series.map((s) => ({ slug: s.slug, title: s.title }))}
      />
      <p className="mt-4 text-sm text-muted">
        Paylaşmadan önce <a href="/topluluk-kurallari" className="underline">topluluk kurallarına</a> göz at.
      </p>
    </div>
  );
}
