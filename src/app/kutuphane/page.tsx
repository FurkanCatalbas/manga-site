import type { Metadata } from "next";
import { LibraryList } from "@/components/Library";
import { getSeriesList, toLibraryItems } from "@/lib/data";

export const metadata: Metadata = {
  title: "Kütüphane",
  description: "Okuduğun seriler ve kaldığın bölümler.",
  // Kişiye özel sayfa, aramalarda çıkmasına gerek yok
  robots: { index: false },
};

export default async function LibraryPage() {
  const series = await getSeriesList();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Kütüphane</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Okuduğun seriler bu cihazda saklanır.</p>
      <LibraryList items={toLibraryItems(series)} />
    </div>
  );
}
