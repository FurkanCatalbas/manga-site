import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommunityTabs, Crumbs, Soon } from "@/components/topluluk/CommunityShell";
import { TopicFeed } from "@/components/topluluk/ForumClient";
import { categoryOf, FORUM_CATEGORIES, getCategoryTopics } from "@/lib/forum";

export function generateStaticParams() {
  return FORUM_CATEGORIES.map((c) => ({ kategori: c.slug }));
}

export async function generateMetadata(props: PageProps<"/forum/[kategori]">): Promise<Metadata> {
  const c = categoryOf((await props.params).kategori);
  if (!c) return {};
  return { title: `${c.name} · Forum`, description: c.description, alternates: { canonical: `/forum/${c.slug}` } };
}

export default async function CategoryPage(props: PageProps<"/forum/[kategori]">) {
  const c = categoryOf((await props.params).kategori);
  if (!c) notFound();
  const data = await getCategoryTopics(c.slug);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Crumbs items={[{ href: "/forum", label: "Forum" }, { label: c.name }]} />
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span aria-hidden>{c.emoji} </span>
            {c.name}
          </h1>
          <p className="mt-1 text-muted">{c.description}</p>
        </div>
        <Link href={`/forum/yeni?kategori=${c.slug}`} className="btn-primary shrink-0 px-4 py-2 text-sm">Yeni konu</Link>
      </div>
      <CommunityTabs active="/forum" />
      {!data ? <Soon what="Forum" /> : <TopicFeed initial={data.topics} hasMore={data.hasMore} category={c.slug} />}
    </div>
  );
}
