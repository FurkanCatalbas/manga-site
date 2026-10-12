import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Crumbs, Soon } from "@/components/topluluk/CommunityShell";
import { ListPage } from "@/components/topluluk/Lists";
import { getSessionUser } from "@/lib/hesap";
import { getList } from "@/lib/listeler";

const parseId = (raw: string) => (/^\d{1,9}$/.test(raw) ? Number(raw) : 0);

export async function generateMetadata(props: PageProps<"/liste/[id]">): Promise<Metadata> {
  const id = parseId((await props.params).id);
  const list = id ? await getList(id) : undefined;
  if (!list || !list.isPublic) return { title: "Liste", robots: { index: false } };
  return {
    title: `${list.title} · @${list.owner.username} listesi`,
    description: list.description || `${list.owner.username} kullanıcısının ${list.itemCount} serilik webtoon ve manga listesi.`,
    alternates: { canonical: `/liste/${list.id}` },
    openGraph: list.covers[0] ? { images: [{ url: list.covers[0] }] } : undefined,
  };
}

export default function Page(props: PageProps<"/liste/[id]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Crumbs items={[{ href: "/listeler", label: "Listeler" }, { label: "Liste" }]} />
      <Suspense fallback={<div className="panel h-64 animate-pulse" />}>
        <ListContent params={props.params} />
      </Suspense>
    </div>
  );
}

async function ListContent({ params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  const list = id ? await getList(id) : undefined;
  if (list === null) return <Soon what="Listeler" />;
  if (!list) notFound();
  // Gizli listeyi yalnızca sahibi görür
  if (!list.isPublic) {
    const me = await getSessionUser();
    if (me?.id !== list.userId) notFound();
  }
  // Sahibin kimliği istemciye gönderilmez; düzenleme yetkisi sunucuda yeniden doğrulanır
  const { userId: _owner, ...view } = list; // eslint-disable-line @typescript-eslint/no-unused-vars
  return <ListPage list={view} />;
}
