"use client";

// Profil ayarlarında herkese açık profil bilgileri: kısa tanıtım ve en sevilen seri.
import { useEffect, useState } from "react";
import { myProfileSettings, updateProfile } from "@/lib/profil-actions";

const field =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-base placeholder:text-muted focus:border-accent/60 focus:outline-none";

export function ProfileExtras({ seriesOptions }: { seriesOptions: { slug: string; title: string }[] }) {
  const [loaded, setLoaded] = useState<boolean | "closed">(false);
  const [bio, setBio] = useState("");
  const [favorite, setFavorite] = useState("");
  const [message, setMessage] = useState<{ error?: string; ok?: string }>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    myProfileSettings().then((s) => {
      if (cancelled) return;
      if (!s) return setLoaded("closed");
      setBio(s.bio);
      setFavorite(seriesOptions.find((o) => o.slug === s.favoriteSlug)?.title ?? "");
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [seriesOptions]);

  if (loaded === "closed") return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const fav = seriesOptions.find((o) => o.title.toLocaleLowerCase("tr") === favorite.trim().toLocaleLowerCase("tr"));
    if (favorite.trim() && !fav) return setMessage({ error: "Seri listede bulunamadı; listeden seç ya da boş bırak." });
    setPending(true);
    setMessage(undefined);
    const res = await updateProfile({ bio, favoriteSlug: fav?.slug ?? "" });
    setPending(false);
    setMessage(res.ok ? { ok: "Profilin güncellendi." } : { error: res.error });
  }

  return (
    <form onSubmit={save} className="panel grid gap-3 p-5" aria-busy={!loaded}>
      <label htmlFor="bio" className="text-sm font-semibold">Kısa tanıtım</label>
      <textarea
        id="bio"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        maxLength={300}
        rows={3}
        placeholder="Ne tür seriler seversin? En sevdiğin karakter kim?"
        // Kayıtlı bilgi gelmeden yazılanlar ezilmesin
        disabled={!loaded}
        className={field}
      />
      <label htmlFor="favori" className="text-sm font-semibold">En sevdiğin seri</label>
      <input
        id="favori"
        list="favori-listesi"
        value={favorite}
        onChange={(e) => setFavorite(e.target.value)}
        disabled={!loaded}
        placeholder="Seri adı yaz…"
        className={field}
      />
      <datalist id="favori-listesi">
        {seriesOptions.map((o) => (
          <option key={o.slug} value={o.title} />
        ))}
      </datalist>
      <p className="text-xs text-muted">Profil sayfanın kapağında görünür.</p>
      {message?.error && <p role="alert" className="text-sm font-semibold text-accent">{message.error}</p>}
      {message?.ok && <p className="text-sm font-semibold text-fresh">{message.ok}</p>}
      <button type="submit" disabled={pending || !loaded} className="btn-primary justify-self-start disabled:opacity-50">
        Kaydet
      </button>
    </form>
  );
}
