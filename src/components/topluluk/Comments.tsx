"use client";

// Yorum alanı: yazma, yanıtlama (tek seviye), beğeni, spoiler gizleme, silme ve şikâyet.
// İlk sayfa sunucudan (önbellekli) gelir; giriş durumu ve beğenilenler tarayıcıda öğrenilir.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/hesap/Avatar";
import { ChatIcon, FlagIcon, HeartIcon, ReplyIcon } from "@/components/icons";
import { TimeAgo } from "@/components/TimeAgo";
import { profileHref } from "./UserBits";
import { authClient } from "@/lib/hesap-client";
import type { CommentPage, CommentView, ScopeRef } from "@/lib/topluluk";
import { deleteComment, loadMoreComments, myLikes, postComment, reportComment, toggleLike } from "@/lib/topluluk-actions";

const MAX = 2000;

type Me = { username: string; image: string | null } | null;

function Composer({
  refScope,
  parentId,
  me,
  loginHref,
  autoFocus,
  onPosted,
  onCancel,
}: {
  refScope: ScopeRef;
  parentId?: number;
  me: Me;
  loginHref: string;
  autoFocus?: boolean;
  onPosted: (c: CommentView, parentId: number | null) => void;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  if (!me) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/[0.06]">
        <p className="text-sm text-muted">Yorum yazmak ve beğenmek için giriş yap.</p>
        <Link href={loginHref} className="btn-primary px-4 py-2 text-sm">Giriş yap</Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    try {
      const res = await postComment({ ref: refScope, body, spoiler, parentId: parentId ?? null });
      if (!res.ok) return setError(res.error);
      setBody("");
      setSpoiler(false);
      onPosted(res.comment, res.parentId);
    } catch {
      setError("Gönderilemedi, bağlantını kontrol edip tekrar dene.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-3">
      <Avatar name={me.username} image={me.image} size={parentId ? 28 : 36} />
      <div className="min-w-0 flex-1">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MAX}
          rows={parentId ? 2 : 3}
          autoFocus={autoFocus}
          aria-label={parentId ? "Yanıtın" : "Yorumun"}
          placeholder={parentId ? "Yanıt yaz…" : "Bu bölüm hakkında ne düşünüyorsun?"}
          className="w-full resize-y rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-[15px] placeholder:text-muted focus:border-accent/60 focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            Spoiler içeriyor
          </label>
          <div className="flex items-center gap-2">
            {onCancel && (
              <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm font-semibold text-muted hover:text-fg">
                Vazgeç
              </button>
            )}
            <button type="submit" disabled={pending || body.trim().length < 2} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
              {pending ? "Gönderiliyor…" : parentId ? "Yanıtla" : "Gönder"}
            </button>
          </div>
        </div>
        {error && <p role="alert" className="mt-2 text-sm font-semibold text-accent">{error}</p>}
      </div>
    </form>
  );
}

function SpoilerText({ text }: { text: string }) {
  const [shown, setShown] = useState(false);
  if (shown) return <Body text={text} />;
  return (
    <button
      type="button"
      onClick={() => setShown(true)}
      className="mt-1 block w-full rounded-lg bg-white/[0.04] px-3 py-2 text-left text-sm ring-1 ring-white/[0.06] hover:bg-white/[0.07]"
    >
      <span className="font-semibold text-accent">Spoiler</span>
      <span className="text-muted"> · göstermek için dokun</span>
    </button>
  );
}

const Body = ({ text }: { text: string }) => (
  <p className="mt-1 text-[15px] leading-relaxed break-words whitespace-pre-line text-fg/90">{text}</p>
);

function Item({
  c,
  me,
  loginHref,
  liked,
  onLike,
  onReply,
  onDelete,
  isReply,
}: {
  c: CommentView;
  me: Me;
  loginHref: string;
  liked: boolean;
  onLike: (id: number) => void;
  onReply?: () => void;
  onDelete: (id: number) => void;
  isReply?: boolean;
}) {
  const [reported, setReported] = useState(false);
  const mine = !!me && c.user?.username === me.username;

  if (c.deleted) {
    return <p className="py-2 text-sm text-muted italic">Bu yorum silindi.</p>;
  }

  async function report() {
    const reason = prompt("Neden şikâyet ediyorsun? (küfür, spoiler, reklam…)");
    if (reason === null) return;
    const res = await reportComment(c.id, reason);
    if (res.ok) setReported(true);
    else alert(res.error);
  }

  return (
    <div className="flex gap-3">
      <Avatar name={c.user?.username ?? "?"} image={c.user?.image} size={isReply ? 28 : 36} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          {c.user && (
            <Link href={profileHref(c.user.username)} className="font-semibold hover:text-accent">
              @{c.user.username}
            </Link>
          )}
          {c.score ? (
            <span className="rounded-md bg-amber-400/15 px-1.5 text-[11px] font-bold text-amber-300" title="Seriye verdiği puan">
              ★ {c.score}/10
            </span>
          ) : null}
          <TimeAgo iso={c.createdAt} className="text-xs text-muted" />
        </p>
        {c.spoiler ? <SpoilerText text={c.body} /> : <Body text={c.body} />}
        <div className="mt-1.5 flex items-center gap-4 text-xs font-semibold text-muted">
          {me ? (
            <button
              type="button"
              onClick={() => onLike(c.id)}
              aria-pressed={liked}
              className={`flex items-center gap-1 transition-colors ${liked ? "text-accent" : "hover:text-fg"}`}
            >
              <HeartIcon size={15} fill={liked ? "currentColor" : "none"} />
              {c.likes > 0 ? c.likes : "Beğen"}
            </button>
          ) : (
            <Link href={loginHref} className="flex items-center gap-1 hover:text-fg">
              <HeartIcon size={15} />
              {c.likes > 0 ? c.likes : "Beğen"}
            </Link>
          )}
          {onReply && (
            <button type="button" onClick={onReply} className="flex items-center gap-1 hover:text-fg">
              <ReplyIcon size={15} />
              Yanıtla
            </button>
          )}
          {mine ? (
            <button
              type="button"
              onClick={() => confirm("Yorumun silinsin mi?") && onDelete(c.id)}
              className="hover:text-fg"
            >
              Sil
            </button>
          ) : (
            me && (
              <button type="button" onClick={report} disabled={reported} className="flex items-center gap-1 hover:text-fg disabled:opacity-60">
                <FlagIcon size={14} />
                {reported ? "Bildirildi" : "Şikâyet et"}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export function Comments({
  refScope,
  initial,
  loginHref,
  title = "Yorumlar",
  preview,
}: {
  refScope: ScopeRef;
  initial: CommentPage;
  loginHref: string;
  title?: string;
  /** Verilirse yalnızca bu kadar başlık gösterilir, "Tüm yorumlar" ile açılır (bölüm sayfası) */
  preview?: number;
}) {
  const { data: session } = authClient.useSession();
  const me: Me = session ? { username: session.user.username || session.user.name, image: session.user.image ?? null } : null;
  const [threads, setThreads] = useState(initial.threads);
  const [total, setTotal] = useState(initial.total);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(!preview);
  const [loading, setLoading] = useState(false);
  const userId = session?.user.id;

  // Giriş yapılınca beğenilen yorumları öğren
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    myLikes(refScope).then((ids) => {
      if (!cancelled) setLiked(new Set(ids));
    });
    return () => {
      cancelled = true;
    };
  }, [userId, refScope]);

  const update = (id: number, fn: (c: CommentView) => CommentView) =>
    setThreads((ts) => ts.map((t) => (t.id === id ? fn(t) : { ...t, replies: t.replies.map((r) => (r.id === id ? fn(r) : r)) })));

  function onPosted(c: CommentView, parentId: number | null) {
    setTotal((n) => n + 1);
    setExpanded(true);
    if (parentId === null) setThreads((ts) => [c, ...ts]);
    else setThreads((ts) => ts.map((t) => (t.id === parentId ? { ...t, replies: [...t.replies, c] } : t)));
    setReplyTo(null);
  }

  async function onLike(id: number) {
    const was = liked.has(id);
    // Hemen göster, sunucudan gelen sayıyla düzelt
    setLiked((s) => {
      const n = new Set(s);
      if (was) n.delete(id);
      else n.add(id);
      return n;
    });
    update(id, (c) => ({ ...c, likes: Math.max(0, c.likes + (was ? -1 : 1)) }));
    const res = await toggleLike(refScope, id);
    if (!res.ok) return alert(res.error);
    setLiked((s) => {
      const n = new Set(s);
      if (res.liked) n.add(id);
      else n.delete(id);
      return n;
    });
    update(id, (c) => ({ ...c, likes: res.likes }));
  }

  async function onDelete(id: number) {
    const res = await deleteComment(refScope, id);
    if (!res.ok) return alert(res.error);
    setTotal((n) => Math.max(0, n - 1));
    setThreads((ts) =>
      ts
        .map((t) => ({ ...t, replies: t.replies.filter((r) => r.id !== id) }))
        .flatMap((t) => (t.id !== id ? [t] : t.replies.length ? [{ ...t, deleted: true, body: "", user: null }] : [])),
    );
  }

  async function more() {
    const last = threads.at(-1);
    if (!last) return;
    setLoading(true);
    const page = await loadMoreComments(refScope, last.id);
    setLoading(false);
    if (!page) return;
    setThreads((ts) => [...ts, ...page.threads.filter((t) => !ts.some((x) => x.id === t.id))]);
    setHasMore(page.hasMore);
  }

  const shown = expanded ? threads : threads.slice(0, preview);

  return (
    <section aria-labelledby="yorumlar" className="scroll-mt-24" id="yorumlar-bolumu">
      <h2 id="yorumlar" className="mb-4 flex items-center gap-2 text-xl font-bold tracking-tight">
        <ChatIcon size={20} className="text-muted" />
        {title} <span className="text-base font-medium text-muted">({total})</span>
      </h2>
      <Composer refScope={refScope} me={me} loginHref={loginHref} onPosted={onPosted} />

      {threads.length === 0 ? (
        <p className="mt-6 text-sm text-muted">İlk yorumu sen yaz.</p>
      ) : (
        <ol className="mt-6 grid gap-5">
          {shown.map((t) => (
            <li key={t.id} className="grid gap-3">
              <Item
                c={t}
                me={me}
                loginHref={loginHref}
                liked={liked.has(t.id)}
                onLike={onLike}
                onDelete={onDelete}
                onReply={me ? () => setReplyTo(replyTo === t.id ? null : t.id) : undefined}
              />
              {(t.replies.length > 0 || replyTo === t.id) && (
                <div className="ml-12 grid gap-3 border-l border-white/[0.06] pl-4">
                  {t.replies.map((r) => (
                    <Item
                      key={r.id}
                      c={r}
                      me={me}
                      loginHref={loginHref}
                      liked={liked.has(r.id)}
                      onLike={onLike}
                      onDelete={onDelete}
                      onReply={me ? () => setReplyTo(t.id) : undefined}
                      isReply
                    />
                  ))}
                  {replyTo === t.id && (
                    <Composer
                      refScope={refScope}
                      parentId={t.id}
                      me={me}
                      loginHref={loginHref}
                      autoFocus
                      onPosted={onPosted}
                      onCancel={() => setReplyTo(null)}
                    />
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {!expanded && threads.length > (preview ?? 0) ? (
        <button type="button" onClick={() => setExpanded(true)} className="btn-ghost mt-5 w-full text-sm">
          Tüm yorumları göster ({total})
        </button>
      ) : (
        hasMore && (
          <button type="button" onClick={more} disabled={loading} className="btn-ghost mt-5 w-full text-sm disabled:opacity-60">
            {loading ? "Yükleniyor…" : "Daha fazla yorum"}
          </button>
        )
      )}
    </section>
  );
}
