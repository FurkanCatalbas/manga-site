import { asc } from "drizzle-orm";
import { Suspense } from "react";
import { BulkImport } from "@/components/admin/BulkImport";
import { ChapterImport } from "@/components/admin/ChapterImport";
import { db } from "@/db";
import { series } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Bölüm al" };

export default function ImportPage() {
  return (
    <Suspense fallback={<p>Yükleniyor…</p>}>
      <Import />
    </Suspense>
  );
}

async function Import() {
  await requireAdmin();
  const list = await db.select({ slug: series.slug, title: series.title }).from(series).orderBy(asc(series.title));
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">Bölüm al</h1>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Başka sitede açtığın bölümün görsel bağlantılarını tek tıkla buraya getirir. Görseller R2&apos;ye
          yüklenmez, sitede kaynak adresten gösterilir.
        </p>
      </div>
      <ChapterImport seriesList={list} />
      <BulkImport seriesList={list} />
    </div>
  );
}
