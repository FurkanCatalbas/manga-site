"use client";

// Profil: kullanıcı adı, fotoğraf, çıkış ve hesap silme. Giriş yoksa giriş sayfasına gönderir.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient, authError } from "@/lib/hesap-client";
import { Avatar } from "./Avatar";
import { ProfileExtras } from "./ProfileExtras";

const input =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-base placeholder:text-muted focus:border-accent/60 focus:outline-none";

export function ProfileView({ seriesOptions = [] }: { seriesOptions?: { slug: string; title: string }[] }) {
  const router = useRouter();
  const { data, isPending, refetch } = authClient.useSession();
  const [username, setUsername] = useState<string>();
  const [message, setMessage] = useState<{ error?: string; ok?: string }>();
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isPending && !data) router.replace("/giris?geri=/profil");
  }, [isPending, data, router]);

  if (isPending || !data) return <div className="panel h-64 animate-pulse" />;
  const user = data.user;
  const current = username ?? user.username ?? "";

  async function saveUsername(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(undefined);
    const { error } = await authClient.updateUser({ username: current.trim().toLowerCase() });
    setPending(false);
    if (error) return setMessage({ error: authError(error) });
    setUsername(undefined);
    await refetch({ query: { disableCookieCache: true } });
    setMessage({ ok: "Kullanıcı adın güncellendi." });
  }

  async function removePhoto() {
    const { error } = await authClient.updateUser({ image: null });
    if (error) return setMessage({ error: authError(error) });
    await refetch({ query: { disableCookieCache: true } });
  }

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  async function deleteAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    setPending(true);
    const { error } = await authClient.deleteUser(password ? { password, callbackURL: "/" } : { callbackURL: "/" });
    setPending(false);
    if (error) return setMessage({ error: authError(error) });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <div className="panel flex items-center gap-4 p-5">
        <Avatar name={user.username || user.name} image={user.image} size={64} />
        <div className="min-w-0">
          <p className="truncate text-xl font-bold tracking-tight">@{user.username}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <Link href={`/u/${user.username}`} className="mt-1 inline-block text-sm font-semibold text-accent hover:text-fg">
            Herkese açık profilini gör →
          </Link>
          {user.image && (
            <button type="button" onClick={removePhoto} className="mt-1 text-xs font-semibold text-muted hover:text-fg">
              Fotoğrafı kaldır
            </button>
          )}
        </div>
      </div>

      <form onSubmit={saveUsername} className="panel grid gap-3 p-5">
        <label htmlFor="username" className="text-sm font-semibold">Kullanıcı adı</label>
        <div className="flex items-center gap-2">
          <span className="text-muted">@</span>
          <input
            id="username"
            value={current}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_]{3,20}"
            className={input}
          />
        </div>
        <p className="text-xs text-muted">Yorumlarda bu ad görünür. 3–20 karakter: harf, rakam ve alt çizgi.</p>
        {message?.error && <p role="alert" className="text-sm font-semibold text-accent">{message.error}</p>}
        {message?.ok && <p className="text-sm font-semibold text-fresh">{message.ok}</p>}
        <button type="submit" disabled={pending || current === user.username} className="btn-primary justify-self-start disabled:opacity-50">
          Kaydet
        </button>
      </form>

      <ProfileExtras seriesOptions={seriesOptions} />

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={signOut} className="btn-ghost">Çıkış yap</button>
        <button type="button" onClick={() => setConfirmDelete((v) => !v)} className="btn-ghost text-accent">
          Hesabımı sil
        </button>
      </div>

      {confirmDelete && (
        <form onSubmit={deleteAccount} className="panel grid gap-3 border border-accent/40 p-5">
          <p className="text-sm leading-relaxed">
            Hesabın ve paylaştığın her şey (yorumlar, puanlar, listeler, forum ve sohbet mesajları) <strong>kalıcı olarak</strong> silinir. Bu işlem geri alınamaz.
          </p>
          <label htmlFor="password" className="text-sm font-semibold">Şifren (e-postayla kayıt olduysan)</label>
          <input id="password" name="password" type="password" autoComplete="current-password" className={input} />
          <p className="text-xs text-muted">Google ile girdiysen boş bırak; uzun süredir girişliysen yeniden giriş yapman istenebilir.</p>
          <button type="submit" disabled={pending} className="btn-primary justify-self-start disabled:opacity-60">
            Evet, hesabımı kalıcı olarak sil
          </button>
        </form>
      )}
    </div>
  );
}
