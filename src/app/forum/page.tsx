import type { Metadata } from "next";
import Link from "next/link";
import { TimeAgo } from "@/components/TimeAgo";
import { CommunityTabs, Soon } from "@/components/topluluk/CommunityShell";
import { TopicFeed } from "@/components/topluluk/ForumClient";
import { FORUM_CATEGORIES, getForumHome } from "@/lib/forum";

export const metadata: Metadata = {
  title: "Forum",
  description: "Webtoon ve manga forumu: seri önerileri, teoriler, bölüm tartışmaları ve çeviri istekleri.",
  alternates: { canonical: "/forum" },
};

const names = Object.fromEntries(FORUM_CATEGORIES.map((c) => [c.slug, c.name]));

export default async function ForumPage() {
  const data = await getForumHome();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Forum</h1>
        <Link href="/forum/yeni" className="btn-primary px-4 py-2 text-sm">Yeni konu</Link>
      </div>
      <CommunityTabs active="/forum" />
      {!data ? (
        <Soon what="Forum" />
      ) : (
        <div className="grid gap-10">
          <ul className="grid gap-3 sm:grid-cols-2">
            {FORUM_CATEGORIES.map((c) => {
              const s = data.stats[c.slug];
              return (
                <li key={c.slug}>
                  <Link href={`/forum/${c.slug}`} className="panel flex h-full gap-4 p-4 transition hover:ring-white/20">
                    <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-xl">
                      {c.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold tracking-tight">{c.name}</span>
                      <span className="mt-0.5 block text-sm text-muted">{c.description}</span>
                      <span className="mt-2 block text-xs text-muted">
                        {s ? (
                          <>
                            {s.topics} konu · {s.posts} yanıt
                            {s.last && (
                              <>
                                {" "}· son: <TimeAgo iso={s.last} />
                              </>
                            )}
                          </>
                        ) : (
                          "Henüz konu yok"
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <section>
            <h2 className="mb-3 text-xl font-bold tracking-tight">Son hareketli konular</h2>
            <TopicFeed initial={data.latest} categoryNames={names} />
          </section>
        </div>
      )}
    </div>
  );
}
