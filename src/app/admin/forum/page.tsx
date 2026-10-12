import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { db } from "@/db";
import { chatMessages, forumPosts, forumReports, forumTopics, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { categoryOf } from "@/lib/forum";
import { isMissingTable } from "@/lib/genres";
import { formatDate } from "@/lib/series";
import {
  adminDeleteChatMessage,
  adminDeletePost,
  adminDeleteTopic,
  dismissForumReport,
  setTopicFlag,
  setUserBanned,
} from "../actions";

export const metadata = { title: "Forum ve sohbet" };

export default function ForumAdminPage() {
  return (
    <Suspense fallback={<p>Yükleniyor…</p>}>
      <ForumAdmin />
    </Suspense>
  );
}

async function load() {
  try {
    const [reports, topics, chat] = await Promise.all([
      db
        .select({
          id: forumReports.id,
          reason: forumReports.reason,
          topicId: forumReports.topicId,
          postId: forumReports.postId,
          topicTitle: forumTopics.title,
          topicBody: forumTopics.body,
          postBody: forumPosts.body,
          topicUser: forumTopics.userId,
          postUser: forumPosts.userId,
        })
        .from(forumReports)
        .innerJoin(forumTopics, eq(forumTopics.id, forumReports.topicId))
        .leftJoin(forumPosts, eq(forumPosts.id, forumReports.postId))
        .orderBy(desc(forumReports.id))
        .limit(100),
      db
        .select({
          id: forumTopics.id,
          title: forumTopics.title,
          category: forumTopics.category,
          pinned: forumTopics.pinned,
          locked: forumTopics.locked,
          replies: forumTopics.replyCount,
          createdAt: forumTopics.createdAt,
          userId: users.id,
          username: users.username,
          banned: users.banned,
        })
        .from(forumTopics)
        .innerJoin(users, eq(users.id, forumTopics.userId))
        .orderBy(desc(forumTopics.lastPostAt))
        .limit(40),
      db
        .select({
          id: chatMessages.id,
          body: chatMessages.body,
          createdAt: chatMessages.createdAt,
          userId: users.id,
          username: users.username,
          banned: users.banned,
        })
        .from(chatMessages)
        .innerJoin(users, eq(users.id, chatMessages.userId))
        .where(eq(chatMessages.deleted, false))
        .orderBy(desc(chatMessages.id))
        .limit(60),
    ]);
    return { reports, topics, chat };
  } catch (e) {
    if (isMissingTable(e)) return null;
    throw e;
  }
}

function BanButton({ userId, username, banned }: { userId: string; username: string | null; banned: boolean }) {
  return banned ? (
    <ConfirmButton action={setUserBanned.bind(null, userId, false)} confirmText="Evet, engeli kaldır">
      Engeli kaldır
    </ConfirmButton>
  ) : (
    <ConfirmButton action={setUserBanned.bind(null, userId, true)} confirmText={`Evet, @${username} engellensin`}>
      Engelle
    </ConfirmButton>
  );
}

async function ForumAdmin() {
  await requireAdmin();
  const data = await load();
  if (!data) {
    return (
      <div>
        <h1 className="text-3xl font-extrabold">Forum ve sohbet</h1>
        <p className="mt-2 text-muted">
          Tablolar henüz yok. SQL&apos;i <Link href="/admin/yorumlar" className="underline">Yorumlar</Link> sayfasında bulabilirsin.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-10">
      <h1 className="text-3xl font-extrabold">Forum ve sohbet</h1>

      <section>
        <h2 className="mb-2 text-xl font-bold">Forum şikâyetleri ({data.reports.length})</h2>
        {data.reports.length === 0 ? (
          <p className="text-sm text-muted">Bekleyen şikâyet yok.</p>
        ) : (
          <ul className="border-t border-line">
            {data.reports.map((r) => (
              <li key={r.id} className="grid gap-2 border-b border-line py-4">
                <p className="text-sm">
                  <span className="font-semibold text-accent">Şikâyet:</span> {r.reason} ·{" "}
                  <Link href={`/forum/konu/${r.topicId}${r.postId ? `#yanit-${r.postId}` : ""}`} className="underline">
                    {r.topicTitle}
                  </Link>{" "}
                  ({r.postId ? "yanıt" : "konu"})
                </p>
                <p className="line-clamp-4 text-sm break-words whitespace-pre-line text-fg/80">{r.postId ? r.postBody : r.topicBody}</p>
                <div className="flex flex-wrap gap-2">
                  {r.postId ? (
                    <ConfirmButton action={adminDeletePost.bind(null, r.postId)} confirmText="Evet, yanıtı sil">
                      Yanıtı sil
                    </ConfirmButton>
                  ) : (
                    <ConfirmButton action={adminDeleteTopic.bind(null, r.topicId)} confirmText="Evet, konu tümüyle silinsin">
                      Konuyu sil
                    </ConfirmButton>
                  )}
                  <ConfirmButton action={dismissForumReport.bind(null, r.id)} confirmText="Evet, şikâyeti kapat">
                    Şikâyeti kapat
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold">Son konular</h2>
        <ul className="border-t border-line">
          {data.topics.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line py-3">
              <span className="min-w-0 flex-1">
                <Link href={`/forum/konu/${t.id}`} className="font-semibold hover:text-accent">
                  {t.pinned && "📌 "}
                  {t.locked && "🔒 "}
                  {t.title}
                </Link>
                <span className="block text-xs text-muted">
                  @{t.username} · {categoryOf(t.category)?.name ?? t.category} · {t.replies} yanıt · {formatDate(t.createdAt.toISOString())}
                </span>
              </span>
              <ConfirmButton action={setTopicFlag.bind(null, t.id, "pinned", !t.pinned)} confirmText={t.pinned ? "Sabitlemeyi kaldır" : "Evet, sabitle"}>
                {t.pinned ? "Sabitten çıkar" : "Sabitle"}
              </ConfirmButton>
              <ConfirmButton action={setTopicFlag.bind(null, t.id, "locked", !t.locked)} confirmText={t.locked ? "Kilidi aç" : "Evet, kilitle"}>
                {t.locked ? "Kilidi aç" : "Kilitle"}
              </ConfirmButton>
              <ConfirmButton action={adminDeleteTopic.bind(null, t.id)} confirmText="Evet, konu tümüyle silinsin">
                Sil
              </ConfirmButton>
              <BanButton userId={t.userId} username={t.username} banned={t.banned} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold">Son sohbet mesajları</h2>
        <ul className="border-t border-line">
          {data.chat.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line py-2.5">
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-semibold">@{m.username}</span>
                {m.banned && <span className="ml-1 rounded bg-accent/15 px-1.5 text-xs font-bold text-accent">engelli</span>}{" "}
                <span className="text-muted">{m.createdAt.toLocaleString("tr-TR")}</span>
                <span className="block break-words text-fg/85">{m.body}</span>
              </span>
              <ConfirmButton action={adminDeleteChatMessage.bind(null, m.id)} confirmText="Evet, sil">
                Sil
              </ConfirmButton>
              <BanButton userId={m.userId} username={m.username} banned={m.banned} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
