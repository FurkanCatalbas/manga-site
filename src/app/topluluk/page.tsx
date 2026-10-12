import type { Metadata } from "next";
import Link from "next/link";
import { ChatIcon } from "@/components/icons";
import { TimeAgo } from "@/components/TimeAgo";
import { CommunityTabs } from "@/components/topluluk/CommunityShell";
import { ListCard } from "@/components/topluluk/Lists";
import { getForumHome } from "@/lib/forum";
import { getRecentLists } from "@/lib/listeler";

export const metadata: Metadata = {
  title: "Topluluk",
  description: "webtooku topluluğu: forum, canlı sohbet ve okurların öneri listeleri.",
  alternates: { canonical: "/topluluk" },
};

export default async function CommunityPage() {
  const [forum, lists] = await Promise.all([getForumHome(), getRecentLists(3)]);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-extrabold tracking-tight">Topluluk</h1>
      <CommunityTabs active="/topluluk" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr]">
        <section className="panel p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Forumda son konular</h2>
            <Link href="/forum" className="text-sm font-semibold text-muted hover:text-fg">Foruma git →</Link>
          </div>
          {forum && forum.latest.length > 0 ? (
            <ul className="grid grid-cols-1 gap-0.5">
              {forum.latest.slice(0, 6).map((t) => (
                <li key={t.id}>
                  <Link href={`/forum/konu/${t.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.04]">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{t.title}</span>
                      <span className="text-xs text-muted">
                        @{t.author.username} · <TimeAgo iso={t.lastPostAt} />
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-sm text-muted">
                      <ChatIcon size={14} />
                      {t.replyCount}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Henüz konu yok. <Link href="/forum/yeni" className="font-semibold text-accent">İlk konuyu aç</Link></p>
          )}
        </section>

        <Link
          href="/sohbet"
          className="panel relative flex min-h-48 flex-col justify-end overflow-hidden p-5 transition hover:ring-white/20"
        >
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(139,92,246,0.35),transparent_55%),radial-gradient(circle_at_10%_90%,rgba(255,79,139,0.25),transparent_50%)]" />
          <span className="relative flex items-center gap-2 text-xs font-bold tracking-wider text-fresh uppercase">
            <span className="h-2 w-2 animate-pulse rounded-full bg-fresh" />
            Canlı
          </span>
          <span className="relative mt-2 text-2xl font-bold tracking-tight">Sohbete katıl</span>
          <span className="relative mt-1 text-sm text-muted">Okurlarla anlık konuş: yeni bölümler, öneriler, teoriler.</span>
        </Link>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight">Öneri listeleri</h2>
          <Link href="/listeler" className="text-sm font-semibold text-muted hover:text-fg">Tümü →</Link>
        </div>
        {lists && lists.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((l) => (
              <li key={l.id}>
                <ListCard list={l} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="panel p-6 text-center text-muted">Henüz liste yok. Seri sayfalarındaki “Listeye ekle” ile ilkini oluştur.</p>
        )}
      </section>
    </div>
  );
}
