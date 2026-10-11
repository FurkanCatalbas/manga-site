"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createChapter } from "@/app/admin/actions";
import { field, label, primaryBtn, secondaryBtn } from "./ui";
import { MAX_UPLOAD_BYTES, sortByName, uploadImage } from "./upload";

const CONCURRENCY = 3;
const ACCEPT = ["image/webp", "image/jpeg", "image/png", "image/avif", "image/gif"];

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
    const incoming = [...list].filter((f) => ACCEPT.includes(f.type));
    const tooBig = incoming.filter((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig.length) {
      setMessage({ error: `4 MB'tan büyük dosyalar eklenmedi: ${tooBig.map((f) => f.name).join(", ")}` });
    } else {
      setMessage(undefined);
    }
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
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 border-[3px] border-dashed border-ink px-6 py-10 text-center ${dragging ? "bg-pink/30" : "tone bg-white"}`}
      >
        <span className="font-display text-lg">Sayfaları buraya sürükle</span>
        <span className="text-sm text-ink/70">
          ya da tıklayıp seç. Dosya adına göre sıralanır (001.webp, 002.webp…). En fazla 4 MB.
        </span>
        <input
          type="file"
          multiple
          accept={ACCEPT.join(",")}
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
              <li key={`${f.name}-${f.lastModified}-${i}`} className="border-2 border-ink bg-white text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previews[i]} alt="" className="aspect-[2/3] w-full object-cover object-top" />
                <div className="flex items-center justify-between gap-1 border-t-2 border-ink px-1 py-1">
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
                    className="px-1 text-pink disabled:opacity-30"
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
          <div className="h-3 border-2 border-ink bg-white">
            <div className="h-full bg-pink transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-sm">{done} / {files.length} sayfa yüklendi</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={publish} disabled={pending || files.length === 0} className={primaryBtn}>
          {pending ? "Yükleniyor…" : `${number}. bölümü yayınla`}
        </button>
        {message?.error && <p role="alert" className="font-semibold text-pink">{message.error}</p>}
        {message?.ok && <p className="font-semibold text-blue">{message.ok}</p>}
      </div>
    </div>
  );
}
