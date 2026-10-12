"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createSeries, updateSeries, type SeriesInput } from "@/app/admin/actions";
import { cleanGenreName } from "@/lib/series";
import { slugify } from "@/lib/slug";
import { field, label, primaryBtn } from "./ui";
import { ACCEPT_IMAGES, isImageFile, MAX_UPLOAD_BYTES, uploadImage } from "./upload";

type Props = {
  initial?: SeriesInput;
  /** Türler listesi (panel → Türler); seçilebilir çipler olarak gösterilir */
  allGenres?: string[];
  /** Çeviri kaynakları listesi (panel → Kaynaklar); null ise tablolar henüz yok */
  sources?: { id: number; name: string }[] | null;
};

export function SeriesForm({ initial, allGenres = [], sources = [] }: Props) {
  const editing = !!initial;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [genres, setGenres] = useState<string[]>(initial?.genres ?? []);
  const [newGenre, setNewGenre] = useState("");
  // Listedekiler + seride olup listede olmayanlar (eski kayıtlar) + formda yeni eklenenler
  const options = [...new Set([...allGenres, ...genres])].sort((a, b) => a.localeCompare(b, "tr"));
  const toggleGenre = (g: string) =>
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  const addNewGenre = () => {
    const g = cleanGenreName(newGenre);
    if (!g) return;
    // Aynı tür farklı yazımla (büyük/küçük harf) iki kez eklenmesin
    const existing = options.find((o) => o.toLocaleLowerCase("tr") === g.toLocaleLowerCase("tr"));
    setGenres((prev) => (prev.includes(existing ?? g) ? prev : [...prev, existing ?? g]));
    setNewGenre("");
  };
  const [status, setStatus] = useState<SeriesInput["status"]>(initial?.status ?? "Devam Ediyor");
  const [sourceId, setSourceId] = useState(initial?.source?.fansubId ?? 0);
  const [sourceUrl, setSourceUrl] = useState(initial?.source?.url ?? "");
  const [cover, setCover] = useState(initial?.cover ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ error?: string; ok?: string }>();
  const [pending, startTransition] = useTransition();

  const filePreview = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : null), [coverFile]);
  useEffect(() => () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
  }, [filePreview]);
  const preview = filePreview ?? cover;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(undefined);
    startTransition(async () => {
      try {
        let coverUrl = cover;
        if (coverFile) {
          if (!slug) throw new Error("Önce seri adresini doldur.");
          coverUrl = (await uploadImage(coverFile, { slug, kind: "cover" })).url;
          setCover(coverUrl);
          setCoverFile(null);
        }
        const input: SeriesInput = {
          slug,
          title,
          author,
          description,
          genres,
          status,
          cover: coverUrl,
          // Tablolar yoksa kaynak hiç gönderilmez (mevcut değer korunur)
          ...(sources ? { source: { fansubId: sourceId || null, url: sourceUrl } } : {}),
        };
        const result = await (editing ? updateSeries(input) : createSeries(input));
        if (result) setMessage(result);
      } catch (err) {
        setMessage({ error: (err as Error).message });
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6 md:grid-cols-[200px_1fr]">
      <div>
        <span className={label}>Kapak</span>
        <label className="flex aspect-[2/3] cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-surface hover:border-accent text-center text-sm">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Kapak önizleme" className="h-full w-full object-cover" />
          ) : (
            <span className="px-4">Görsel seç</span>
          )}
          <input
            type="file"
            accept={ACCEPT_IMAGES}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && !isImageFile(f)) return setMessage({ error: `${f.name} bir görsel değil.` });
              if (f && f.size > MAX_UPLOAD_BYTES) return setMessage({ error: "Kapak 4 MB'tan büyük olamaz." });
              setMessage(undefined);
              setCoverFile(f ?? null);
            }}
          />
        </label>
        {preview && <p className="mt-1 text-xs text-muted">Değiştirmek için görsele tıkla.</p>}
      </div>

      <div className="grid gap-4">
        <div>
          <label htmlFor="title" className={label}>Seri adı</label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="slug" className={label}>Adres</label>
          <div className="flex items-center rounded-lg border border-line bg-surface">
            <span className="pl-3 text-muted">/seri/</span>
            <input
              id="slug"
              required
              value={slug}
              disabled={editing}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              className="w-full px-1 py-2 outline-none disabled:text-muted"
            />
          </div>
          {editing && <p className="mt-1 text-xs text-muted">Adres, bağlantılar bozulmasın diye sonradan değiştirilemez.</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="author" className={label}>Yazar / çizer</label>
            <input id="author" required value={author} onChange={(e) => setAuthor(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="status" className={label}>Durum</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as SeriesInput["status"])}
              className={field}
            >
              <option>Devam Ediyor</option>
              <option>Tamamlandı</option>
            </select>
          </div>
        </div>
        <fieldset>
          <legend className={label}>Türler</legend>
          {options.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {options.map((g) => {
                const on = genres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleGenre(g)}
                    className={`rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${
                      on ? "border-accent bg-accent text-white" : "border-line bg-surface hover:border-accent"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <label htmlFor="new-genre" className="sr-only">Yeni tür</label>
            <input
              id="new-genre"
              value={newGenre}
              maxLength={40}
              onChange={(e) => setNewGenre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addNewGenre();
                }
              }}
              placeholder="Listede yoksa yeni tür yaz"
              className={`${field} max-w-xs`}
            />
            <button type="button" onClick={addNewGenre} className="rounded-lg bg-surface-2 px-4 py-2 text-sm font-semibold hover:bg-line">
              Ekle
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">
            Seçmek için türe dokun. Yeni tür, seri kaydedilince Türler listesine de eklenir.
          </p>
        </fieldset>
        {sources && (
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="source" className={label}>Çeviri kaynağı (isteğe bağlı)</label>
              <select id="source" value={sourceId} onChange={(e) => setSourceId(Number(e.target.value))} className={field}>
                <option value={0}>Yok (kendi çevirim)</option>
                {sources.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              {sources.length === 0 && (
                <p className="mt-1 text-xs text-muted">Kaynak eklemek için panelde Kaynaklar sayfasına git.</p>
              )}
            </div>
            {sourceId > 0 && (
              <div>
                <label htmlFor="source-url" className={label}>Serinin o sitedeki adresi (isteğe bağlı)</label>
                <input
                  id="source-url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="Boşsa kaynağın ana sitesine gider"
                  className={field}
                />
              </div>
            )}
          </fieldset>
        )}
        <div>
          <label htmlFor="description" className={label}>Açıklama</label>
          <textarea
            id="description"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={field}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={pending} className={primaryBtn}>
            {pending ? "Kaydediliyor…" : editing ? "Değişiklikleri kaydet" : "Seriyi oluştur"}
          </button>
          {message?.error && <p role="alert" className="font-semibold text-accent">{message.error}</p>}
          {message?.ok && <p className="font-semibold text-fresh">{message.ok}</p>}
        </div>
      </div>
    </form>
  );
}
