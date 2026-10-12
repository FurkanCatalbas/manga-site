"use client";

// Öneri listeleri arayüzü: seri sayfasındaki "Listeye ekle" menüsü, liste kartları ve liste sayfası (sahibi düzenler).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@/components/icons";
import { TimeAgo } from "@/components/TimeAgo";
import { authClient } from "@/lib/hesap-client";
import type { ListSummary, ListView } from "@/lib/listeler";
import { createList, deleteList, moveItem, myListsFor, setItemNote, toggleInList, updateList } from "@/lib/liste-actions";
import { UserLink } from "./UserBits";

const field =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-[15px] placeholder:text-muted focus:border-accent/60 focus:outline-none";

const ListIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" aria-hidden>
    <path d="M8 6h13M8 12h13M8 18h8M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </svg>
);

/** Seri sayfasındaki "Listeye ekle": kullanıcının listeleri işaretlenir, yeni liste açılabilir. */
export function AddToList({ slug, className = "" }: { slug: string; className?: string }) {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState<{ id: number; title: string; has: boolean; count: number }[] | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  async function toggleOpen() {
    if (!session) return router.push(`/giris?geri=${encodeURIComponent(`/seri/${slug}`)}`);
    const next = !open;
    setOpen(next);
    setError(undefined);
    if (next) setMine(await myListsFor(slug));
  }

  async function toggle(id: number) {
    const res = await toggleInList(id, slug);
    if (!res.ok) return setError(res.error);
    setMine((m) => m?.map((l) => (l.id === id ? { ...l, has: res.has, count: l.count + (res.has ? 1 : -1) } : l)) ?? null);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await createList({ title, seriesSlug: slug });
    if (!res.ok) return setError(res.error);
    setTitle("");
    setMine(await myListsFor(slug));
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={toggleOpen} aria-expanded={open} className={`btn-ghost ${className}`}>
        <ListIcon />
        Listeye ekle
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-surface p-2 shadow-2xl ring-1 shadow-black/60 ring-white/10">
          <p className="px-2 pt-1 pb-2 text-xs font-bold tracking-wider text-muted uppercase">Listelerin</p>
          {mine === null ? (
            <p className="px-2 py-2 text-sm text-muted">Yükleniyor…</p>
          ) : mine.length === 0 ? (
            <p className="px-2 py-2 text-sm text-muted">Henüz listen yok. Aşağıdan ilkini oluştur.</p>
          ) : (
            <ul className="max-h-60 overflow-y-auto">
              {mine.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => toggle(l.id)}
                    aria-pressed={l.has}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-white/[0.06]"
                  >
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md ring-1 ${l.has ? "bg-accent ring-accent" : "ring-white/20"}`}>
                      {l.has && <CheckIcon size={13} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{l.title}</span>
                    <span className="text-xs text-muted">{l.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={create} className="mt-1 flex gap-1.5 border-t border-white/[0.06] px-1 pt-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Yeni liste adı…"
              aria-label="Yeni liste adı"
              className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-sm focus:border-accent/60 focus:outline-none"
            />
            <button type="submit" disabled={title.trim().length < 3} className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50">
              Oluştur
            </button>
          </form>
          {error && <p role="alert" className="px-2 pt-2 text-xs font-semibold text-accent">{error}</p>}
        </div>
      )}
    </div>
  );
}

/** Liste kartı: 4 kapaklı kolaj, ad, sahip, seri sayısı. */
export function ListCard({ list, showOwner = true }: { list: ListSummary; showOwner?: boolean }) {
  return (
    <Link href={`/liste/${list.id}`} className="panel group block p-3 transition hover:ring-white/20">
      <div className="grid aspect-[2/1] grid-cols-4 gap-1 overflow-hidden rounded-xl bg-surface-2">
        {Array.from({ length: 4 }, (_, i) =>
          list.covers[i] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} referrerPolicy="no-referrer" src={list.covers[i]} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span key={i} className="bg-white/[0.03]" />
          ),
        )}
      </div>
      <p className="mt-3 line-clamp-1 font-bold tracking-tight group-hover:text-accent">{list.title}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
        {showOwner && <span className="truncate">@{list.owner.username} ·</span>}
        <span className="shrink-0">{list.itemCount} seri</span>
        {!list.isPublic && <span className="shrink-0">· gizli</span>}
      </p>
    </Link>
  );
}

/** Liste sayfası: herkes görür, sahibi düzenler (ad, açıklama, gizlilik, sıra, notlar, silme). */
export function ListPage({ list: initial }: { list: Omit<ListView, "userId"> }) {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const owner = session?.user.username === initial.owner.username;
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: initial.title, description: initial.description, isPublic: initial.isPublic });
  const [error, setError] = useState<string>();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await updateList(list.id, form);
    if (!res.ok) return setError(res.error);
    setList((l) => ({ ...l, ...form }));
    setEditing(false);
    setError(undefined);
  }

  async function remove(slug: string) {
    const res = await toggleInList(list.id, slug);
    if (res.ok) setList((l) => ({ ...l, items: l.items.filter((i) => i.slug !== slug), itemCount: l.itemCount - 1 }));
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= list.items.length) return;
    const items = [...list.items];
    [items[index], items[target]] = [items[target], items[index]];
    setList((l) => ({ ...l, items }));
    await moveItem(list.id, list.items[index].slug, dir);
  }

  async function note(slug: string, current: string) {
    const text = prompt("Bu seri için kısa notun (neden öneriyorsun?)", current);
    if (text === null) return;
    const res = await setItemNote(list.id, slug, text);
    if (res.ok) setList((l) => ({ ...l, items: l.items.map((i) => (i.slug === slug ? { ...i, note: text.trim().slice(0, 200) } : i)) }));
  }

  async function destroy() {
    if (!confirm("Liste kalıcı olarak silinsin mi?")) return;
    const res = await deleteList(list.id);
    if (res.ok) router.push(`/u/${list.owner.username}`);
  }

  return (
    <div>
      {editing ? (
        <form onSubmit={save} className="panel grid gap-3 p-5">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={80} aria-label="Liste adı" className={field} />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            maxLength={500}
            placeholder="Liste hakkında kısa açıklama"
            aria-label="Açıklama"
            className={field}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
            Herkese açık (profilde ve Listeler sayfasında görünür)
          </label>
          {error && <p role="alert" className="text-sm font-semibold text-accent">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary px-4 py-2 text-sm">Kaydet</button>
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost px-4 py-2 text-sm">Vazgeç</button>
            <button type="button" onClick={destroy} className="btn-ghost ml-auto px-4 py-2 text-sm text-accent">Listeyi sil</button>
          </div>
        </form>
      ) : (
        <header>
          <h1 className="text-3xl font-extrabold tracking-tight break-words">{list.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <UserLink user={list.owner} size={24} />
            <span>{list.items.length} seri</span>
            <span>
              güncellendi <TimeAgo iso={list.updatedAt} />
            </span>
            {!list.isPublic && <span className="rounded-md bg-white/10 px-1.5 text-xs font-bold">GİZLİ</span>}
          </div>
          {list.description && <p className="mt-3 max-w-prose leading-relaxed whitespace-pre-line text-fg/80">{list.description}</p>}
          {owner && (
            <button type="button" onClick={() => setEditing(true)} className="btn-ghost mt-4 px-4 py-2 text-sm">
              Düzenle
            </button>
          )}
        </header>
      )}

      {list.items.length === 0 ? (
        <p className="panel mt-6 p-6 text-center text-muted">
          Bu liste boş.{owner && " Seri sayfalarındaki “Listeye ekle” ile seri ekleyebilirsin."}
        </p>
      ) : (
        <ol className="mt-6 grid gap-3">
          {list.items.map((item, i) => (
            <li key={item.slug} className="panel flex gap-3 p-3 sm:gap-4">
              <span className="w-6 shrink-0 pt-1 text-center font-display text-xl text-muted/70">{i + 1}</span>
              <Link href={`/seri/${item.slug}`} className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img referrerPolicy="no-referrer" src={item.cover} alt="" loading="lazy" className="h-24 w-[4.5rem] rounded-lg object-cover ring-1 ring-white/10" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/seri/${item.slug}`} className="line-clamp-2 font-semibold hover:text-accent">
                  {item.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted">{item.status}</p>
                {item.note && <p className="mt-1.5 text-sm leading-relaxed text-fg/80">“{item.note}”</p>}
                {owner && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="hover:text-fg disabled:opacity-40">↑ Yukarı</button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === list.items.length - 1} className="hover:text-fg disabled:opacity-40">↓ Aşağı</button>
                    <button type="button" onClick={() => note(item.slug, item.note)} className="hover:text-fg">{item.note ? "Notu düzenle" : "Not ekle"}</button>
                    <button type="button" onClick={() => remove(item.slug)} className="hover:text-fg">Çıkar</button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Listeler sayfasındaki "Yeni liste" düğmesi. */
export function NewListButton() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  async function create() {
    if (!session) return router.push("/giris?geri=/listeler");
    const title = prompt("Liste adı (ör. “En iyi murim serileri”)");
    if (!title) return;
    const res = await createList({ title });
    if (!res.ok) return alert(res.error);
    router.push(`/liste/${res.id}`);
  }
  return (
    <button type="button" onClick={create} className="btn-primary px-4 py-2 text-sm">
      Yeni liste
    </button>
  );
}
