"use client";

import { useState, useTransition } from "react";
import { dangerBtn } from "./ui";

/** İki adımlı silme butonu: önce "Emin misin?" sorar, tarayıcı diyaloğu açmaz. */
export function ConfirmButton({
  action,
  children,
  confirmText = "Evet, sil",
}: {
  action: () => Promise<void>;
  children: React.ReactNode;
  confirmText?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={dangerBtn}>
        {children}
      </button>
    );
  }
  return (
    <span className="inline-flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(action)}
        className={`${dangerBtn} border-accent bg-accent text-white`}
      >
        {pending ? "Siliniyor…" : confirmText}
      </button>
      <button type="button" disabled={pending} onClick={() => setAsking(false)} className={dangerBtn}>
        Vazgeç
      </button>
    </span>
  );
}
