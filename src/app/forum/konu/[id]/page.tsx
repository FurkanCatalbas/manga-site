import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { TimeAgo } from "@/components/TimeAgo";
import { Crumbs, Soon } from "@/components/topluluk/CommunityShell";
import { TopicActions, TopicReplies } from "@/components/topluluk/ForumClient";
import { UserLink, UserText } from "@/components/topluluk/UserBits";
import { categoryOf, getRecentTopicIds, getTopic } from "@/lib/forum";
import { absoluteUrl } from "@/lib/site";

export async function generateStaticParams() {
  const ids = await getRecentTopicIds(100);
  // cacheComponents boş liste kabul etmiyor: konu yokken yer tutucu 404 verir
  return ids.length ? ids.map((t) => ({ id: String(t.id) })) : [{ id: "0" }];
}

const parseId = (raw: string) => (/^\d{1,9}$/.test(raw) ? Number(raw) : 0);

export async function generateMetadata(props: PageProps<"/forum/konu/[id]">): Promise<Metadata> {
  const id = parseId((await props.params).id);
  const t = id ? await getTopic(id) : undefined;
  if (!t) return {};
  const description = t.spoiler ? `${t.title} · webtooku forumu` : t.body.replace(/\s+/g, " ").slice(0, 160);
  return { title: `${t.title} · Forum`, description, alternates: { canonical: `/forum/konu/${t.id}` } };
}

export default async function TopicPage(props: PageProps<"/forum/konu/[id]">) {
  const id = parseId((await props.params).id);
  const t = id ? await getTopic(id) : undefined;
  if (t === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Soon what="Forum" />
      </div>
    );
  }
  if (!t) notFound();
  const c = categoryOf(t.category);
  const url = absoluteUrl(`/forum/konu/${t.id}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": url,
    url,
    headline: t.title,
    ...(t.spoiler ? {} : { text: t.body.slice(0, 1000) }),
    datePublished: t.createdAt,
    author: { "@type": "Person", name: t.author.username, url: absoluteUrl(`/u/${t.author.username}`) },
    interactionStatistic: { "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: t.replyCount },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ href: "/forum", label: "Forum" }, ...(c ? [{ href: `/forum/${c.slug}`, label: c.name }] : [])]} />
      <article className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-1.5">
          {t.pinned && <span className="rounded-md bg-accent/15 px-1.5 text-[11px] font-bold text-accent">SABİT</span>}
          {t.locked && <span className="rounded-md bg-white/10 px-1.5 text-[11px] font-bold text-muted">KİLİTLİ</span>}
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight break-words sm:text-3xl">{t.title}</h1>
        <div className="mt-3 flex items-center justify-between gap-3">
          <UserLink user={t.author} size={32} className="text-sm" />
          <TimeAgo iso={t.createdAt} className="shrink-0 text-xs text-muted" />
        </div>
        {t.series && (
          <Link
            href={`/seri/${t.series.slug}`}
            className="mt-4 flex items-center gap-3 rounded-xl bg-white/[0.04] p-2.5 ring-1 ring-white/[0.06] hover:bg-white/[0.07]"
          >
            {t.seriesCover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img referrerPolicy="no-referrer" src={t.seriesCover} alt="" className="h-14 w-10 rounded-md object-cover" />
            )}
            <span className="min-w-0">
              <span className="block text-xs text-muted">İlgili seri</span>
              <span className="block truncate font-semibold">{t.series.title}</span>
            </span>
          </Link>
        )}
        <UserText text={t.body} spoiler={t.spoiler} className="mt-4 text-[15px]" />
        <div className="mt-4">
          <TopicActions topicId={t.id} author={t.author.username} replyCount={t.replyCount} />
        </div>
      </article>

      <TopicReplies
        topicId={t.id}
        initial={t.posts}
        hasMore={t.hasMore}
        locked={t.locked}
        loginHref={`/giris?geri=${encodeURIComponent(`/forum/konu/${t.id}`)}`}
      />
    </div>
  );
}
