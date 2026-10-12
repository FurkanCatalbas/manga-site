import type { Metadata } from "next";
import { CommunityTabs, Soon } from "@/components/topluluk/CommunityShell";
import { ListCard, NewListButton } from "@/components/topluluk/Lists";
import { getRecentLists } from "@/lib/listeler";

export const metadata: Metadata = {
  title: "Öneri listeleri",
  description: "Okurların hazırladığı webtoon ve manga öneri listeleri: türlere, ruh hâline ve zevke göre seçilmiş seriler.",
  alternates: { canonical: "/listeler" },
};

export default async function ListsPage() {
  const lists = await getRecentLists(36);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Öneri listeleri</h1>
          <p className="mt-1 text-sm text-muted">Okurların kendi seçtiği seriler. Seri sayfalarındaki “Listeye ekle” ile sen de oluştur.</p>
        </div>
        <NewListButton />
      </div>
      <CommunityTabs active="/listeler" />
      {lists === null ? (
        <Soon what="Listeler" />
      ) : lists.length === 0 ? (
        <p className="panel p-6 text-center text-muted">Henüz liste yok. İlk listeyi sen oluştur!</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((l) => (
            <li key={l.id}>
              <ListCard list={l} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
