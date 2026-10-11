"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createChapter } from "@/app/admin/actions";
import { field, label, primaryBtn, secondaryBtn } from "./ui";
import { ACCEPT_IMAGES, isImageFile, MAX_UPLOAD_BYTES, sortByName, uploadImage } from "./upload";

const CONCURRENCY = 3;

export function ChapterUploader({ slug, nextNumber }: { slug: string; nextNumber: number }) {
  const [number, setNumber] = useState(nextNumber);
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(0);
  const [message, setMessage] = useState<{ error?: string; ok?: string }>();
  const [pending, startTransition] = useTransition();

  // Önizleme adresleri; dosyalar değişince eskileri serbest bırakılır
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const all = [...list];
    const incoming = all.filter(isImageFile);
    const notImage = all.filter((f) => !isImageFile(f));
    const tooBig = incoming.filter((f) => f.size > MAX_UPLOAD_BYTES);
    const problems = [
      notImage.length && `Görsel olmadığı için eklenmedi: ${notImage.map((f) => f.name).join(", ")}`,
      tooBig.length && `4 MB'tan büyük olduğu için eklenmedi: ${tooBig.map((f) => f.name).join(", ")}`,
    ].filter(Boolean);
    setMessage(problems.length ? { error: problems.join(" ") } : undefined);
    const ok = incoming.filter((f) => f.size <= MAX_UPLOAD_BYTES);
    setFiles((prev) => sortByName([...prev, ...ok]));
  }

  function move(i: number, dir: -1 | 1) {
    setFiles((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function publish() {
    setMessage(undefined);
    setDone(0);
    startTransition(async () => {
      try {
        // Sayfaları sırayı koruyarak, aynı anda en fazla 3 dosya olacak şekilde yükle
        const urls: string[] = new Array(files.length);
        let cursor = 0;
        const worker = async () => {
          while (cursor < files.length) {
            const i = cursor++;
            urls[i] = await uploadImage(files[i], { slug, kind: "page", chapter: number, index: i + 1 });
            setDone((d) => d + 1);
          }
        };
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));

        const result = await createChapter({ slug, number, title, pages: urls });
        setMessage(result);
        if (result?.ok) {
          setFiles([]);
          setTitle("");
          setNumber((n) => n + 1);
        }
      } catch (err) {
        setMessage({ error: (err as Error).message });
      }
    });
  }

  const progress = files.length ? Math.round((done / files.length) * 100) : 0;

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <div>
          <label htmlFor="ch-number" className={label}>Bölüm no</label>
          <input
            id="ch-number"
            type="number"
            min={1}
            value={number}
            onChange={(e) => setNumber(Number(e.target.value))}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="ch-title" className={label}>Bölüm adı (isteğe bağlı)</label>
          <input id="ch-title" value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
        </div>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line px-6 py-10 text-center ${dragging ? "border-accent bg-accent/10" : "bg-surface hover:border-accent"}`}
      >
        <span className="text-lg font-semibold">Sayfaları buraya sürükle</span>
        <span className="text-sm text-muted">
          ya da tıklayıp seç. Dosya adına göre sıralanır (001.webp, 002.webp…). En fazla 4 MB.
        </span>
        <input
          type="file"
          multiple
          accept={ACCEPT_IMAGES}
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {files.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{files.length} sayfa</p>
            <button type="button" onClick={() => setFiles([])} disabled={pending} className={secondaryBtn}>
              Listeyi temizle
            </button>
          </div>
          <ol className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
            {files.map((f, i) => (
              <li key={`${f.name}-${f.lastModified}-${i}`} className="overflow-hidden rounded-lg border border-line bg-surface text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previews[i]} alt="" className="aspect-[2/3] w-full object-cover object-top" />
                <div className="flex items-center justify-between gap-1 border-t border-line px-1 py-1">
                  <button type="button" aria-label="Öne al" onClick={() => move(i, -1)} disabled={pending || i === 0} className="px-1 disabled:opacity-30">
                    ‹
                  </button>
                  <span className="font-semibold">{i + 1}</span>
                  <button type="button" aria-label="Sona al" onClick={() => move(i, 1)} disabled={pending || i === files.length - 1} className="px-1 disabled:opacity-30">
                    ›
                  </button>
                  <button
                    type="button"
                    aria-label={`${f.name} dosyasını çıkar`}
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    disabled={pending}
                    className="px-1 text-accent disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {pending && (
        <div aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-sm">{done} / {files.length} sayfa yüklendi</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={publish} disabled={pending || files.length === 0} className={primaryBtn}>
          {pending ? "Yükleniyor…" : `${number}. bölümü yayınla`}
        </button>
        {message?.error && <p role="alert" className="font-semibold text-accent">{message.error}</p>}
        {message?.ok && <p className="font-semibold text-fresh">{message.ok}</p>}
      </div>
    </div>
  );
}
