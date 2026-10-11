"use client";

import { useActionState } from "react";
import { field, label, primaryBtn } from "@/components/admin/ui";
import { login } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="tone mx-auto max-w-sm border-[3px] border-ink bg-white p-8">
      <h1 className="font-display text-2xl">Giriş yap</h1>
      <div className="mt-6">
        <label htmlFor="password" className={label}>Yönetici şifresi</label>
        <input id="password" name="password" type="password" required autoFocus autoComplete="current-password" className={field} />
      </div>
      {state?.error && <p role="alert" className="mt-3 font-semibold text-pink">{state.error}</p>}
      <button type="submit" disabled={pending} className={`${primaryBtn} mt-6 w-full`}>
        {pending ? "Kontrol ediliyor…" : "Giriş yap"}
      </button>
    </form>
  );
}
