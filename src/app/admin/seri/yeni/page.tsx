import { Suspense } from "react";
import { SeriesForm } from "@/components/admin/SeriesForm";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Yeni seri" };

export default function NewSeriesPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-extrabold">Yeni seri</h1>
      <Suspense fallback={<p>Yükleniyor…</p>}>
        <Guarded />
      </Suspense>
    </div>
  );
}

async function Guarded() {
  await requireAdmin();
  return <SeriesForm />;
}
