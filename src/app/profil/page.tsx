import type { Metadata } from "next";
import { ProfileView } from "@/components/hesap/ProfileView";
import { getSeriesList } from "@/lib/data";

export const metadata: Metadata = { title: "Profil", robots: { index: false } };

export default async function ProfilePage() {
  const series = await getSeriesList();
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">Profil</h1>
      <ProfileView seriesOptions={series.map((s) => ({ slug: s.slug, title: s.title }))} />
    </div>
  );
}
