import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { db } from "@/db";
import { chapters, commentReports, comments, series, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { isMissingTable } from "@/lib/genres";
import { formatDate } from "@/lib/series";
import { COMMUNITY_SQL } from "@/lib/topluluk-sql";
import { adminDeleteComment, dismissReports, setUserBanned } from "../actions";

export const metadata = { title: "Yorumlar" };

export default function CommentsAdminPage() {
  return (
    <Suspense fallback={<p>Yükleniyor…</p>}>
      <CommentsAdmin />
    </Suspense>
  );
}

const columns = {
  id: comments.id,
  body: comments.body,
  deleted: comments.deleted,
  createdAt: comments.createdAt,
  userId: users.id,
  username: users.username,
  email: users.email,
  banned: users.banned,
  slug: series.slug,
  seriesTitle: series.title,
  chapter: chapters.number,
};

async function load() {
  const base = () =>
    db
      .select(columns)
      .from(comments)
      .innerJoin(users, eq(users.id, comments.userId))
      .innerJoin(series, eq(series.id, comments.seriesId))
      .leftJoin(chapters, eq(chapters.id, comments.chapterId));
  try {
    const [reported, latest, stats] = await Promise.all([
      db
        .select({
          ...columns,
          reports: sql<number>`count(${commentReports.id})::int`,
          reasons: sql<string[]>`array_agg(${commentReports.reason} order by ${commentReports.createdAt} desc)`,
        })
        .from(commentReports)
        .innerJoin(comments, eq(comments.id, commentReports.commentId))
        .innerJoin(users, eq(users.id, comments.userId))
        .innerJoin(series, eq(series.id, comments.seriesId))
        .leftJoin(chapters, eq(chapters.id, comments.chapterId))
        .groupBy(comments.id, users.id, series.id, chapters.id)
        .orderBy(desc(sql`count(${commentReports.id})`)),
      base().where(eq(comments.deleted, false)).orderBy(desc(comments.id)).limit(50),
      db.execute<{ users: number; comments: number; banned: number }>(
        sql`select (select count(*) from ${users})::int as users, (select count(*) from ${comments})::int as comments,
          (select count(*) from ${users} where banned)::int as banned`,
      ),
    ]);
    return { reported, latest, stats: stats.rows[0] };
  } catch (e) {
    if (isMissingTable(e)) return null;
    throw e;
  }
}

type Row = NonNullable<Awaited<ReturnType<typeof load>>>["latest"][number];

function CommentRow({ c, extra }: { c: Row; extra?: React.ReactNode }) {
  const where = c.chapter != null ? `/seri/${c.slug}/bolum/${c.chapter}` : `/seri/${c.slug}`;
  return (
    <li className="grid gap-2 border-b border-line py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold">@{c.username}</span>
        <span className="text-muted">{c.email}</span>
        {c.banned && <span className="rounded bg-accent/15 px-1.5 text-xs font-bold text-accent">engelli</span>}
        <Link href={`${where}#yorumlar-bolumu`} className="text-muted underline-offset-4 hover:underline">
          {c.seriesTitle}
          {c.chapter != null ? ` · ${c.chapter}. bölüm` : ""}
        </Link>
        <span className="text-muted">{formatDate(new Date(c.createdAt).toISOString())}</span>
      </div>
      <p className="break-words whitespace-pre-line">{c.deleted ? <em className="text-muted">silindi</em> : c.body}</p>
      {extra}
      <div className="flex flex-wrap gap-2">
        <ConfirmButton action={adminDeleteComment.bind(null, c.id)} confirmText="Evet, yorumu sil">
          Yorumu sil
        </ConfirmButton>
        {c.banned ? (
          <ConfirmButton action={setUserBanned.bind(null, c.userId, false)} confirmText="Evet, engeli kaldır">
            Engeli kaldır
          </ConfirmButton>
        ) : (
          <ConfirmButton action={setUserBanned.bind(null, c.userId, true)} confirmText={`Evet, @${c.username} engellensin`}>
            Kullanıcıyı engelle
          </ConfirmButton>
        )}
      </div>
    </li>
  );
}

async function CommentsAdmin() {
  await requireAdmin();
  const data = await load();

  if (!data) {
    return (
      <div className="grid gap-4">
        <h1 className="text-3xl font-extrabold">Yorumlar</h1>
        <div className="rounded-2xl border border-accent/40 bg-surface p-5">
          <p className="font-semibold">Hesap ve yorum tabloları veritabanında henüz yok.</p>
          <p className="mt-1 text-sm text-muted">
            Neon → SQL Editor&apos;de şunu bir kez çalıştır (ya da bilgisayarında <code>npm run db:push</code>), sonra bu
            sayfayı yenile:
          </p>
          <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-bg p-4 text-xs">{COMMUNITY_SQL}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10">
      <div>
        <h1 className="text-3xl font-extrabold">Yorumlar</h1>
        <p className="mt-1 text-sm text-muted">
          {data.stats.users} kullanıcı · {data.stats.comments} yorum · {data.stats.banned} engelli
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-xl font-bold">Şikâyet edilenler ({data.reported.length})</h2>
        {data.reported.length === 0 ? (
          <p className="text-sm text-muted">Bekleyen şikâyet yok.</p>
        ) : (
          <ul className="border-t border-line">
            {data.reported.map((c) => (
              <CommentRow
                key={c.id}
                c={c}
                extra={
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-semibold text-accent">{c.reports} şikâyet:</span>
                    <span className="text-muted">{c.reasons.slice(0, 3).join(" · ")}</span>
                    <ConfirmButton action={dismissReports.bind(null, c.id)} confirmText="Evet, şikâyetleri kapat">
                      Şikâyeti kapat
                    </ConfirmButton>
                  </div>
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold">Son yorumlar</h2>
        {data.latest.length === 0 ? (
          <p className="text-sm text-muted">Henüz yorum yok.</p>
        ) : (
          <ul className="border-t border-line">
            {data.latest.map((c) => (
              <CommentRow key={c.id} c={c} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
