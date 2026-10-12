import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/hesap/Avatar";
import { ChatIcon } from "@/components/icons";
import { TimeAgo } from "@/components/TimeAgo";
import { Soon } from "@/components/topluluk/CommunityShell";
import { ListCard } from "@/components/topluluk/Lists";
import { genreHref } from "@/lib/series";
import { getPublicProfile } from "@/lib/profil";

const clean = (raw: string) => decodeURIComponent(raw).toLowerCase();

export async function generateMetadata(props: PageProps<"/u/[username]">): Promise<Metadata> {
  const username = clean((await props.params).username);
  // Profiller kullanıcı içeriğidir; arama motorlarına kapalı
  return { title: `@${username}`, robots: { index: false } };
}

export default function ProfilePage(props: PageProps<"/u/[username]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-8"><div className="panel h-72 animate-pulse" /></div>}>
      <Profile params={props.params} />
    </Suspense>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] px-4 py-3 text-center ring-1 ring-white/[0.06]">
      <p className="font-display text-2xl leading-none">{value.toLocaleString("tr-TR")}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xl font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

async function Profile({ params }: { params: Promise<{ username: string }> }) {
  const username = clean((await params).username);
  if (!/^[a-z0-9_]{3,20}$/.test(username)) notFound();
  const p = await getPublicProfile(username);
  if (p === null) return <div className="mx-auto max-w-5xl px-4 py-8"><Soon what="Profiller" /></div>;
  if (!p) notFound();

  const joined = new Date(p.joinedAt).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

  return (
    <div>
      {/* Kapak: en sevdiği serinin bulanık kapağı ya da marka gradyanı */}
      <div className="relative h-40 overflow-hidden sm:h-56">
        {p.favorite?.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img referrerPolicy="no-referrer" src={p.favorite.cover} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-50 blur-2xl" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,79,139,0.35),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,0.4),transparent_60%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg" />
      </div>

      <div className="relative mx-auto -mt-16 max-w-5xl px-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <div className="w-fit rounded-full ring-4 ring-bg">
            <Avatar name={p.username} image={p.image} size={112} />
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="truncate font-display text-3xl tracking-tight sm:text-4xl">@{p.username}</h1>
            <p className="mt-1 text-sm text-muted">{joined} tarihinden beri üye</p>
          </div>
        </div>

        {p.banned ? (
          <p className="panel mt-6 p-5 text-muted">Bu hesap topluluk kurallarını ihlal ettiği için askıya alındı.</p>
        ) : (
          <>
            {p.bio && <p className="mt-5 max-w-prose leading-relaxed whitespace-pre-line text-fg/85">{p.bio}</p>}

            {p.badges.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {p.badges.map((b) => (
                  <li
                    key={b.label}
                    title={b.hint}
                    className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-sm font-semibold ring-1 ring-white/[0.08]"
                  >
                    <span aria-hidden>{b.emoji}</span>
                    {b.label}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <Stat value={p.stats.ratings} label="Puan" />
              <Stat value={p.stats.comments} label="Yorum" />
              <Stat value={p.stats.topics + p.stats.posts} label="Forum" />
              <Stat value={p.stats.lists} label="Liste" />
            </div>

            {(p.favorite || p.favoriteGenres.length > 0) && (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {p.favorite && (
                  <Link href={`/seri/${p.favorite.slug}`} className="panel flex items-center gap-4 p-3 transition hover:ring-white/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img referrerPolicy="no-referrer" src={p.favorite.cover} alt="" className="h-20 w-14 rounded-lg object-cover" />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-muted">En sevdiği seri</span>
                      <span className="block truncate text-lg font-bold tracking-tight">{p.favorite.title}</span>
                    </span>
                  </Link>
                )}
                {p.favoriteGenres.length > 0 && (
                  <div className="panel p-4">
                    <p className="text-xs font-semibold text-muted">Sevdiği türler</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.favoriteGenres.map((g) => (
                        <Link key={g} href={genreHref(g)} className="rounded-full border border-white/10 px-3 py-1 text-sm hover:border-accent/50 hover:text-accent">
                          {g}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {p.rated.length > 0 && (
              <Section title="Puanladığı seriler">
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {p.rated.map((r) => (
                    <li key={r.slug}>
                      <Link href={`/seri/${r.slug}`} className="group block">
                        <span className="relative block overflow-hidden rounded-xl ring-1 ring-white/[0.08]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img referrerPolicy="no-referrer" src={r.cover} alt="" loading="lazy" className="aspect-[3/4] w-full object-cover transition group-hover:scale-105" />
                          <span className="absolute right-1.5 bottom-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold backdrop-blur-md">
                            <span className="text-amber-400">★</span> {r.score}
                          </span>
                        </span>
                        <span className="mt-1.5 line-clamp-1 text-sm font-semibold group-hover:text-accent">{r.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {p.lists.length > 0 && (
              <Section title="Listeleri">
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {p.lists.map((l) => (
                    <li key={l.id}>
                      <ListCard list={l} showOwner={false} />
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {p.recentComments.length > 0 && (
              <Section title="Son yorumları">
                <ul className="grid gap-3">
                  {p.recentComments.map((c, i) => {
                    const href = c.chapter ? `/seri/${c.slug}/bolum/${c.chapter}` : `/seri/${c.slug}`;
                    return (
                      <li key={i} className="panel p-4">
                        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                          <Link href={`${href}#yorumlar-bolumu`} className="font-semibold hover:text-accent">
                            {c.seriesTitle}
                            {c.chapter ? ` · ${c.chapter}. bölüm` : ""}
                          </Link>
                          <TimeAgo iso={c.createdAt} className="text-xs text-muted" />
                        </p>
                        <p className="mt-1.5 line-clamp-3 text-[15px] leading-relaxed text-fg/85">
                          {c.spoiler ? <span className="text-muted italic">Spoiler içeren yorum</span> : c.body}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </Section>
            )}

            {p.topics.length > 0 && (
              <Section title="Forum konuları">
                <ul className="panel grid grid-cols-1 gap-0.5 p-1.5">
                  {p.topics.map((t) => (
                    <li key={t.id}>
                      <Link href={`/forum/konu/${t.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.04]">
                        <span className="min-w-0 flex-1 truncate font-semibold">{t.title}</span>
                        <span className="flex shrink-0 items-center gap-1 text-sm text-muted">
                          <ChatIcon size={14} />
                          {t.replyCount}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {p.stats.ratings + p.stats.comments + p.stats.lists + p.stats.topics === 0 && (
              <p className="panel mt-10 p-6 text-center text-muted">@{p.username} henüz bir şey paylaşmadı.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
