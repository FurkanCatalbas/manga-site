"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addUnlistedGenres, createGenre, deleteGenre, renameGenre, type FormState } from "@/app/admin/actions";
import type { GenreRow } from "@/lib/genres";
import { ConfirmButton } from "./ConfirmButton";
import { field, primaryBtn, secondaryBtn } from "./ui";

function Message({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (state?.error) return <p role="alert" className="text-sm font-semibold text-accent">{state.error}</p>;
  if (state?.ok) return <p className="text-sm font-semibold text-fresh">{state.ok}</p>;
  return null;
}

/** Yeni tür ekleme formu; eklenince kutu boşalır. */
export function AddGenreForm() {
  const [state, action, pending] = useActionState(createGenre, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-center gap-3">
      <label htmlFor="genre-name" className="sr-only">Tür adı</label>
      <input id="genre-name" name="name" required maxLength={40} placeholder="Yeni tür, ör. Dövüş Sanatları" className={`${field} max-w-xs`} />
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "Ekleniyor…" : "Ekle"}
      </button>
      <Message state={state} />
    </form>
  );
}

/** Bir tür satırı: ad, adres, kullanan seri sayısı; yerinde ad değiştirme ve silme. */
export function GenreItem({ genre }: { genre: GenreRow }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await renameGenre(genre.id, prev, formData);
    if (result?.ok) setEditing(false);
    return result;
  }, undefined);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line py-3">
      {editing ? (
        <form action={action} className="flex flex-1 flex-wrap items-center gap-2">
          <label htmlFor={`genre-${genre.id}`} className="sr-only">Yeni ad</label>
          <input
            id={`genre-${genre.id}`}
            name="name"
            defaultValue={genre.name}
            required
            maxLength={40}
            autoFocus
            className={`${field} max-w-xs`}
          />
          <button type="submit" disabled={pending} className={primaryBtn}>
            {pending ? "Kaydediliyor…" : "Kaydet"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className={secondaryBtn}>
            Vazgeç
          </button>
          {genre.count > 0 && (
            <p className="w-full text-xs text-muted">Ad, bu türü kullanan {genre.count} seride de değişir.</p>
          )}
          <Message state={state} />
        </form>
      ) : (
        <>
          <span className="min-w-0 flex-1 font-semibold">{genre.name}</span>
          <span className="text-sm text-muted">{genre.count === 0 ? "Kullanılmıyor" : `${genre.count} seri`}</span>
          <button type="button" onClick={() => setEditing(true)} className={secondaryBtn}>
            Adını değiştir
          </button>
          <ConfirmButton
            action={() => deleteGenre(genre.id)}
            confirmText={genre.count > 0 ? `Evet, sil (${genre.count} seriden kaldırılır)` : "Evet, sil"}
          >
            Sil
          </ConfirmButton>
        </>
      )}
    </li>
  );
}

/** Serilerde kullanılıp listede olmayan türleri tek tıkla listeye ekler. */
export function UnlistedGenres({ items }: { items: { name: string; count: number }[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="font-semibold">Serilerde kullanılıp listede olmayan türler</p>
      <p className="mt-1 text-sm text-muted">
        Listeye eklenince seri formunda seçilebilir, buradan da adı değiştirilip silinebilir.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((g) => (
          <li key={g.name} className="rounded-full bg-surface-2 px-3 py-1 text-sm">
            {g.name} <span className="text-muted">· {g.count}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => addUnlistedGenres(items.map((g) => g.name)))}
        className={`${primaryBtn} mt-4`}
      >
        {pending ? "Ekleniyor…" : `Hepsini listeye ekle (${items.length})`}
      </button>
    </div>
  );
}
