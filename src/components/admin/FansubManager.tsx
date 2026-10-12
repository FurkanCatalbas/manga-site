"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createFansub, deleteFansub, updateFansub, type FormState } from "@/app/admin/actions";
import type { FansubRow } from "@/lib/fansubs";
import { slugify } from "@/lib/slug";
import { ConfirmButton } from "./ConfirmButton";
import { field, label, primaryBtn, secondaryBtn } from "./ui";
import { ACCEPT_IMAGES, isImageFile, MAX_UPLOAD_BYTES, uploadImage } from "./upload";

function Message({ state }: { state: FormState }) {
  if (state?.error) return <p role="alert" className="text-sm font-semibold text-accent">{state.error}</p>;
  if (state?.ok) return <p className="text-sm font-semibold text-fresh">{state.ok}</p>;
  return null;
}

/** Logo önizlemesi; logo yoksa adın baş harfi. */
export function SourceLogo({ name, logo, size = 40 }: { name: string; logo: string | null; size?: number }) {
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt="" width={size} height={size} className="shrink-0 rounded-lg object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-lg bg-surface-2 font-bold text-muted"
      style={{ width: size, height: size }}
    >
      {name.charAt(0).toLocaleUpperCase("tr") || "?"}
    </span>
  );
}

/**
 * Kaynak formu (ekleme ve düzenleme). Logo seçildiyse önce R2'ye yüklenir, adresi forma eklenip
 * kaydedilir. Ekleme sırasında logo klasörü addan üretilen adrese göre belirlenir (sunucu da aynısını üretir).
 */
function FansubForm({
  initial,
  submit,
  onDone,
  submitLabel,
}: {
  initial?: FansubRow;
  submit: (prev: FormState, formData: FormData) => Promise<FormState>;
  onDone?: () => void;
  submitLabel: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [fileError, setFileError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const [state, action, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    try {
      if (file) {
        const slug = initial?.slug ?? slugify(name);
        if (!slug) return { error: "Önce kaynak adını yaz." };
        formData.set("logo", (await uploadImage(file, { slug, kind: "fansub" })).url);
      }
      const result = await submit(prev, formData);
      if (result?.ok) {
        setFile(null);
        if (!initial) {
          formRef.current?.reset();
          setName("");
        }
        onDone?.();
      }
      return result;
    } catch (err) {
      return { error: (err as Error).message };
    }
  }, undefined);

  return (
    <form ref={formRef} action={action} className="grid gap-4 sm:grid-cols-[auto_1fr]">
      <label className="flex cursor-pointer flex-col items-center gap-1 text-xs text-muted">
        <SourceLogo name={name} logo={preview ?? initial?.logo ?? null} size={64} />
        Logo seç
        <input
          type="file"
          accept={ACCEPT_IMAGES}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && !isImageFile(f)) return setFileError(`${f.name} bir görsel değil.`);
            if (f && f.size > MAX_UPLOAD_BYTES) return setFileError("Logo 4 MB'tan büyük olamaz.");
            setFileError(undefined);
            setFile(f);
          }}
        />
      </label>
      <div className="grid gap-3">
        <input type="hidden" name="logo" defaultValue={initial?.logo ?? ""} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`fs-name-${initial?.id ?? "new"}`} className={label}>Ad</label>
            <input
              id={`fs-name-${initial?.id ?? "new"}`}
              name="name"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ör. Merlintoon"
              className={field}
            />
          </div>
          <div>
            <label htmlFor={`fs-url-${initial?.id ?? "new"}`} className={label}>Site adresi</label>
            <input
              id={`fs-url-${initial?.id ?? "new"}`}
              name="url"
              defaultValue={initial?.url ?? ""}
              placeholder="ör. merlintoon.com"
              className={field}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={primaryBtn}>
            {pending ? "Kaydediliyor…" : submitLabel}
          </button>
          {onDone && initial && (
            <button type="button" onClick={onDone} className={secondaryBtn}>
              Vazgeç
            </button>
          )}
          {fileError ? <p role="alert" className="text-sm font-semibold text-accent">{fileError}</p> : <Message state={state} />}
        </div>
      </div>
    </form>
  );
}

export function AddFansubForm() {
  return <FansubForm submit={createFansub} submitLabel="Kaynak ekle" />;
}

export function FansubItem({ fansub }: { fansub: FansubRow }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="border-b border-line py-4">
        <FansubForm
          initial={fansub}
          submit={(prev, fd) => updateFansub(fansub.id, prev, fd)}
          onDone={() => setEditing(false)}
          submitLabel="Kaydet"
        />
      </li>
    );
  }
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line py-3">
      <SourceLogo name={fansub.name} logo={fansub.logo} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{fansub.name}</span>
        {fansub.url && <span className="block truncate text-xs text-muted">{fansub.url}</span>}
      </span>
      <span className="text-sm text-muted">{fansub.count === 0 ? "Kullanılmıyor" : `${fansub.count} seri`}</span>
      <button type="button" onClick={() => setEditing(true)} className={secondaryBtn}>
        Düzenle
      </button>
      <ConfirmButton
        action={() => deleteFansub(fansub.id)}
        confirmText={fansub.count > 0 ? `Evet, sil (${fansub.count} seriden kalkar)` : "Evet, sil"}
      >
        Sil
      </ConfirmButton>
    </li>
  );
}
