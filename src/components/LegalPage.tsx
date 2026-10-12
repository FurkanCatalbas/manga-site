// Yasal metin sayfalarının ortak düzeni.
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted">Son güncelleme: {updated}</p>
      <div className="mt-8 grid gap-6 leading-relaxed text-fg/85 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_ul]:grid [&_ul]:gap-1.5">
        {children}
      </div>
    </article>
  );
}
