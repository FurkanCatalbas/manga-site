"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createSeries, updateSeries, type SeriesInput } from "@/app/admin/actions";
import { slugify } from "@/lib/slug";
import { field, label, primaryBtn } from "./ui";
import { MAX_UPLOAD_BYTES, uploadImage } from "./upload";

type Props = { initial?: SeriesInput };

export function SeriesForm({ initial }: Props) {
  const editing = !!initial;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(editing);
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [genres, setGenres] = useState(initial?.genres.join(", ") ?? "");
  const [status, setStatus] = useState<SeriesInput["status"]>(initial?.status ?? "Devam Ediyor");
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
          coverUrl = await uploadImage(coverFile, { slug, kind: "cover" });
          setCover(coverUrl);
          setCoverFile(null);
        }
        const input: SeriesInput = {
          slug,
          title,
          author,
          description,
          genres: genres.split(",").map((g) => g.trim()).filter(Boolean),
          status,
          cover: coverUrl,
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
        <label className="tone flex aspect-[2/3] cursor-pointer items-center justify-center border-2 border-dashed border-ink bg-white text-center text-sm">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Kapak önizleme" className="h-full w-full object-cover" />
          ) : (
            <span className="px-4">Görsel seç</span>
          )}
          <input
            type="file"
            accept="image/webp,image/jpeg,image/png,image/avif"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && f.size > MAX_UPLOAD_BYTES) return setMessage({ error: "Kapak 4 MB'tan büyük olamaz." });
              setCoverFile(f ?? null);
            }}
          />
        </label>
        {preview && <p className="mt-1 text-xs text-ink/60">Değiştirmek için görsele tıkla.</p>}
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
          <div className="flex items-center border-2 border-ink bg-white">
            <span className="pl-3 text-ink/50">/seri/</span>
            <input
              id="slug"
              required
              value={slug}
              disabled={editing}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              className="w-full px-1 py-2 outline-none disabled:text-ink/60"
            />
          </div>
          {editing && <p className="mt-1 text-xs text-ink/60">Adres, bağlantılar bozulmasın diye sonradan değiştirilemez.</p>}
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
        <div>
          <label htmlFor="genres" className={label}>Türler</label>
          <input
            id="genres"
            value={genres}
            onChange={(e) => setGenres(e.target.value)}
            placeholder="Aksiyon, Fantastik"
            className={field}
          />
          <p className="mt-1 text-xs text-ink/60">Virgülle ayır.</p>
        </div>
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
          {message?.error && <p role="alert" className="font-semibold text-pink">{message.error}</p>}
          {message?.ok && <p className="font-semibold text-blue">{message.ok}</p>}
        </div>
      </div>
    </form>
  );
}
