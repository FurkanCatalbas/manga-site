"use client";

import { useActionState } from "react";
import { field, label, primaryBtn } from "@/components/admin/ui";
import { login } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="mx-auto max-w-sm rounded-2xl border border-line bg-surface p-8">
      <h1 className="text-2xl font-bold">Giriş yap</h1>
      <div className="mt-6">
        <label htmlFor="password" className={label}>Yönetici şifresi</label>
        <input id="password" name="password" type="password" required autoFocus autoComplete="current-password" className={field} />
      </div>
      {state?.error && <p role="alert" className="mt-3 font-semibold text-accent">{state.error}</p>}
      <button type="submit" disabled={pending} className={`${primaryBtn} mt-6 w-full`}>
        {pending ? "Kontrol ediliyor…" : "Giriş yap"}
      </button>
    </form>
  );
}
