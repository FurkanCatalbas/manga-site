"use client";

// Forum arayüzü: konu listesi (daha fazla yükleme), yanıtlar ve yanıt yazma, yeni konu formu.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/hesap/Avatar";
import { ChatIcon, FlagIcon } from "@/components/icons";
import { TimeAgo } from "@/components/TimeAgo";
import { authClient } from "@/lib/hesap-client";
import type { PostView, TopicSummary } from "@/lib/forum";
import { createTopic, deletePost, deleteTopic, loadMorePosts, loadMoreTopics, replyTopic, reportForum } from "@/lib/forum-actions";
import { UserLink, UserText } from "./UserBits";

const field =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-[15px] placeholder:text-muted focus:border-accent/60 focus:outline-none";

export const topicHref = (t: { id: number }) => `/forum/konu/${t.id}`;

function TopicRow({ t, showCategory }: { t: TopicSummary; showCategory?: string }) {
  return (
    <li>
      <Link
        href={topicHref(t)}
        className="flex items-center gap-3 rounded-2xl px-3 py-3 ring-1 ring-transparent transition-colors hover:bg-white/[0.04] hover:ring-white/[0.06] sm:px-4"
      >
        <Avatar name={t.author.username} image={t.author.image} size={36} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            {t.pinned && <span className="rounded-md bg-accent/15 px-1.5 text-[11px] font-bold text-accent">SABİT</span>}
            {t.locked && <span className="rounded-md bg-white/10 px-1.5 text-[11px] font-bold text-muted">KİLİTLİ</span>}
            <span className="font-semibold break-words">{t.title}</span>
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span>@{t.author.username}</span>
            {showCategory && <span>· {showCategory}</span>}
            {t.series && <span className="truncate">· {t.series.title}</span>}
            <span>·</span>
            <TimeAgo iso={t.lastPostAt} />
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-sm text-muted">
          <ChatIcon size={15} />
          {t.replyCount}
        </span>
      </Link>
    </li>
  );
}

export function TopicFeed({
  initial,
  hasMore: initialMore = false,
  category,
  categoryNames,
}: {
  initial: TopicSummary[];
  hasMore?: boolean;
  category?: string;
  /** Verilirse her satırda kategori adı yazar (karışık listelerde) */
  categoryNames?: Record<string, string>;
}) {
  const [topics, setTopics] = useState(initial);
  const [hasMore, setHasMore] = useState(initialMore);
  const [loading, setLoading] = useState(false);

  async function more() {
    const last = topics.at(-1);
    if (!last || !category) return;
    setLoading(true);
    const page = await loadMoreTopics(category, { at: last.lastPostAt, id: last.id });
    setLoading(false);
    if (!page) return;
    setTopics((ts) => [...ts, ...page.topics.filter((t) => !ts.some((x) => x.id === t.id))]);
    setHasMore(page.hasMore);
  }

  if (topics.length === 0) return <p className="panel p-6 text-center text-muted">Henüz konu yok. İlk konuyu sen aç!</p>;
  return (
    <>
      <ul className="panel grid grid-cols-1 gap-0.5 p-1.5 sm:p-2">
        {topics.map((t) => (
          <TopicRow key={t.id} t={t} showCategory={categoryNames?.[t.category]} />
        ))}
      </ul>
      {hasMore && (
        <button type="button" onClick={more} disabled={loading} className="btn-ghost mt-4 w-full text-sm disabled:opacity-60">
          {loading ? "Yükleniyor…" : "Daha eski konular"}
        </button>
      )}
    </>
  );
}

function ReportButton({ topicId, postId }: { topicId: number; postId?: number }) {
  const [done, setDone] = useState(false);
  async function report() {
    const reason = prompt("Neden şikâyet ediyorsun? (hakaret, spam, spoiler…)");
    if (reason === null) return;
    const res = await reportForum({ topicId, postId, reason });
    if (res.ok) setDone(true);
    else alert(res.error);
  }
  return (
    <button type="button" onClick={report} disabled={done} className="flex items-center gap-1 hover:text-fg disabled:opacity-60">
      <FlagIcon size={14} />
      {done ? "Bildirildi" : "Şikâyet et"}
    </button>
  );
}

/** Konu sahibinin ya da diğer üyelerin konu altındaki eylemleri. */
export function TopicActions({ topicId, author, replyCount }: { topicId: number; author: string; replyCount: number }) {
  const { data } = authClient.useSession();
  const router = useRouter();
  if (!data) return null;
  const mine = data.user.username === author;
  return (
    <div className="flex items-center gap-4 text-xs font-semibold text-muted">
      {mine ? (
        replyCount === 0 && (
          <button
            type="button"
            onClick={async () => {
              if (!confirm("Konun silinsin mi?")) return;
              const res = await deleteTopic(topicId);
              if (!res.ok) return alert(res.error);
              router.push("/forum");
            }}
            className="hover:text-fg"
          >
            Konuyu sil
          </button>
        )
      ) : (
        <ReportButton topicId={topicId} />
      )}
    </div>
  );
}

export function TopicReplies({
  topicId,
  initial,
  hasMore: initialMore,
  locked,
  loginHref,
}: {
  topicId: number;
  initial: PostView[];
  hasMore: boolean;
  locked: boolean;
  loginHref: string;
}) {
  const { data } = authClient.useSession();
  const [posts, setPosts] = useState(initial);
  const [hasMore, setHasMore] = useState(initialMore);
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const me = data?.user.username;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      const res = await replyTopic({ topicId, body, spoiler });
      if (!res.ok) return setError(res.error);
      setBody("");
      setSpoiler(false);
      // Daha yüklenmemiş yanıtlar varken yeni yanıtı sona eklemek sırayı bozar; o zaman yalnızca bilgi ver
      if (!hasMore) setPosts((p) => [...p, res.post]);
      else setError("Yanıtın gönderildi; görmek için tüm yanıtları yükle.");
    } catch {
      setError("Gönderilemedi, tekrar dene.");
    } finally {
      setPending(false);
    }
  }

  async function more() {
    const last = posts.at(-1);
    const page = await loadMorePosts(topicId, last?.id ?? 0);
    if (!page) return;
    setPosts((p) => [...p, ...page.posts.filter((x) => !p.some((y) => y.id === x.id))]);
    setHasMore(page.hasMore);
  }

  async function remove(id: number) {
    if (!confirm("Yanıtın silinsin mi?")) return;
    const res = await deletePost(id);
    if (!res.ok) return alert(res.error);
    setPosts((p) => p.map((x) => (x.id === id ? { ...x, deleted: true, body: "", author: null } : x)));
  }

  return (
    <section aria-labelledby="yanitlar" className="mt-8">
      <h2 id="yanitlar" className="mb-3 text-lg font-bold">
        Yanıtlar <span className="text-base font-medium text-muted">({posts.length}{hasMore ? "+" : ""})</span>
      </h2>
      {posts.length === 0 ? (
        <p className="text-sm text-muted">Henüz yanıt yok.</p>
      ) : (
        <ol className="grid gap-3">
          {posts.map((p, i) => (
            <li key={p.id} id={`yanit-${p.id}`} className="panel p-4">
              {p.deleted ? (
                <p className="text-sm text-muted italic">Bu yanıt silindi.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <UserLink user={p.author} size={28} className="text-sm" />
                    <span className="shrink-0 text-xs text-muted">
                      #{i + 1} · <TimeAgo iso={p.createdAt} />
                    </span>
                  </div>
                  <UserText text={p.body} spoiler={p.spoiler} className="mt-2 text-[15px]" />
                  {me && (
                    <div className="mt-2 flex gap-4 text-xs font-semibold text-muted">
                      {p.author?.username === me ? (
                        <button type="button" onClick={() => remove(p.id)} className="hover:text-fg">Sil</button>
                      ) : (
                        <ReportButton topicId={topicId} postId={p.id} />
                      )}
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ol>
      )}
      {hasMore && (
        <button type="button" onClick={more} className="btn-ghost mt-4 w-full text-sm">
          Daha fazla yanıt
        </button>
      )}

      <div className="mt-6">
        {locked ? (
          <p className="rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-muted">Bu konu yanıtlara kapatıldı.</p>
        ) : !data ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/[0.06]">
            <p className="text-sm text-muted">Yanıt yazmak için giriş yap.</p>
            <Link href={loginHref} className="btn-primary px-4 py-2 text-sm">Giriş yap</Link>
          </div>
        ) : (
          <form onSubmit={send} className="grid gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={5000}
              aria-label="Yanıtın"
              placeholder="Yanıtını yaz…"
              className={field}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
                Spoiler içeriyor
              </label>
              <button type="submit" disabled={pending || body.trim().length < 2} className="btn-primary px-5 py-2 text-sm disabled:opacity-50">
                {pending ? "Gönderiliyor…" : "Yanıtla"}
              </button>
            </div>
            {error && <p role="alert" className="text-sm font-semibold text-accent">{error}</p>}
          </form>
        )}
      </div>
    </section>
  );
}

export function NewTopicForm({
  categories,
  seriesOptions,
}: {
  categories: { slug: string; name: string }[];
  seriesOptions: { slug: string; title: string }[];
}) {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();
  const [category, setCategory] = useState(categories[0].slug);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [seriesTitle, setSeriesTitle] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  if (!isPending && !data) {
    return (
      <div className="panel flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-muted">Konu açmak için giriş yap.</p>
        <Link href="/giris?geri=/forum/yeni" className="btn-primary px-4 py-2 text-sm">Giriş yap</Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const s = seriesOptions.find((o) => o.title.toLocaleLowerCase("tr") === seriesTitle.trim().toLocaleLowerCase("tr"));
    if (seriesTitle.trim() && !s) return setError("Seri listede bulunamadı; listeden seç ya da boş bırak.");
    setPending(true);
    setError(undefined);
    try {
      const res = await createTopic({ category, title, body, spoiler, seriesSlug: s?.slug ?? null });
      if (!res.ok) return setError(res.error);
      router.push(`/forum/konu/${res.id}`);
    } catch {
      setError("Gönderilemedi, tekrar dene.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel grid gap-4 p-5">
      <div>
        <label htmlFor="kategori" className="mb-1.5 block text-sm font-semibold">Kategori</label>
        <select
          id="kategori"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          // Kategori sayfasından gelindiyse (?kategori=) o seçili gelsin; sayfa statik olduğu için takılınca okunur
          ref={(el) => {
            const fromUrl = new URLSearchParams(window.location.search).get("kategori");
            if (el && !el.dataset.init && fromUrl && categories.some((c) => c.slug === fromUrl)) {
              el.dataset.init = "1";
              queueMicrotask(() => setCategory(fromUrl));
            }
          }}
          className={`${field} [&>option]:bg-surface`}
        >
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="baslik" className="mb-1.5 block text-sm font-semibold">Başlık</label>
        <input id="baslik" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required className={field} />
      </div>
      <div>
        <label htmlFor="metin" className="mb-1.5 block text-sm font-semibold">Metin</label>
        <textarea id="metin" value={body} onChange={(e) => setBody(e.target.value)} rows={8} maxLength={5000} required className={field} />
      </div>
      <div>
        <label htmlFor="seri" className="mb-1.5 block text-sm font-semibold">İlgili seri (isteğe bağlı)</label>
        <input id="seri" list="seri-listesi" value={seriesTitle} onChange={(e) => setSeriesTitle(e.target.value)} placeholder="Seri adı yaz…" className={field} />
        <datalist id="seri-listesi">
          {seriesOptions.map((o) => (
            <option key={o.slug} value={o.title} />
          ))}
        </datalist>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
        Spoiler içeriyor
      </label>
      {error && <p role="alert" className="text-sm font-semibold text-accent">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary justify-self-start disabled:opacity-60">
        {pending ? "Gönderiliyor…" : "Konuyu aç"}
      </button>
    </form>
  );
}
