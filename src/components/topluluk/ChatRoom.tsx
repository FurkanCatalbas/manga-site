"use client";

// Canlı sohbet odası. Sayfa görünürken birkaç saniyede bir yeni mesajları sorar (yoklama);
// sekme arka plandayken durur. Kullanıcı en alttaysa yeni mesajlarda aşağı kaydırılır.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/hesap/Avatar";
import { authClient } from "@/lib/hesap-client";
import type { ChatMessage } from "@/lib/sohbet";
import { deleteChatMessage, sendChatMessage } from "@/lib/sohbet-actions";
import { profileHref } from "./UserBits";

const POLL_MS = 4000;
const time = (iso: string) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

export function ChatRoom() {
  const { data: session } = authClient.useSession();
  const me = session?.user.username;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "closed">("loading");
  const [olderDone, setOlderDone] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const listRef = useRef<HTMLOListElement>(null);
  const lastId = useRef(0);
  const stick = useRef(true); // kullanıcı en alttaysa yeni mesajda aşağı kaydır

  const merge = useCallback((incoming: ChatMessage[], deleted: number[] = []) => {
    if (incoming.length) lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id));
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const gone = new Set(deleted);
      return [...prev, ...incoming.filter((m) => !seen.has(m.id))].filter((m) => !gone.has(m.id));
    });
  }, []);

  // İlk yükleme ve yoklama
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch(`/api/sohbet${lastId.current ? `?sonra=${lastId.current}` : ""}`, { cache: "no-store" });
          const data = (await res.json()) as { messages: ChatMessage[]; deleted: number[]; closed?: boolean };
          if (data.closed) {
            setStatus("closed");
            return;
          }
          merge(data.messages, data.deleted);
          setStatus("ready");
        } catch {
          // Bağlantı kopukluğu: bir sonraki turda tekrar dener
        }
      }
      timer = setTimeout(poll, POLL_MS);
    }
    poll();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        poll();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [merge]);

  // Yeni mesaj gelince (kullanıcı alttaysa) aşağı kaydır
  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function older() {
    const first = messages[0];
    if (!first) return;
    const res = await fetch(`/api/sohbet?once=${first.id}`, { cache: "no-store" });
    const data = (await res.json()) as { messages: ChatMessage[] };
    if (data.messages.length === 0) return setOlderDone(true);
    stick.current = false;
    setMessages((prev) => [...data.messages.filter((m) => !prev.some((p) => p.id === m.id)), ...prev]);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError(undefined);
    try {
      const res = await sendChatMessage(text);
      if (!res.ok) return setError(res.error);
      setText("");
      stick.current = true;
      merge([res.message]);
    } catch {
      setError("Gönderilemedi, tekrar dene.");
    } finally {
      setSending(false);
    }
  }

  async function remove(id: number) {
    const res = await deleteChatMessage(id);
    if (res.ok) setMessages((p) => p.filter((m) => m.id !== id));
  }

  if (status === "closed") return <p className="panel p-6 text-center text-muted">Sohbet çok yakında açılıyor.</p>;

  return (
    <div className="panel flex h-[calc(100dvh-15rem)] min-h-[420px] flex-col overflow-hidden md:h-[calc(100dvh-13rem)]">
      <ol
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 overflow-y-auto px-3 py-3 sm:px-4"
        aria-live="polite"
      >
        {status === "loading" && <li className="py-10 text-center text-sm text-muted">Yükleniyor…</li>}
        {status === "ready" && messages.length >= 60 && !olderDone && (
          <li className="pb-2 text-center">
            <button type="button" onClick={older} className="text-xs font-semibold text-muted hover:text-fg">
              Daha eski mesajlar
            </button>
          </li>
        )}
        {status === "ready" && messages.length === 0 && (
          <li className="py-10 text-center text-sm text-muted">Henüz mesaj yok. Selam ver!</li>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          // Aynı kişinin 3 dakika içindeki ardışık mesajları birleşik görünür
          const grouped =
            prev && prev.user.username === m.user.username && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 180000;
          return (
            <li key={m.id} className={`group flex gap-2.5 rounded-lg px-1 hover:bg-white/[0.03] ${grouped ? "mt-0.5" : "mt-3"}`}>
              <span className="w-8 shrink-0">
                {!grouped && (
                  <Link href={profileHref(m.user.username)}>
                    <Avatar name={m.user.username} image={m.user.image} size={32} />
                  </Link>
                )}
              </span>
              <div className="min-w-0 flex-1">
                {!grouped && (
                  <p className="flex items-baseline gap-2 text-sm">
                    <Link href={profileHref(m.user.username)} className="font-semibold hover:text-accent">
                      @{m.user.username}
                    </Link>
                    <time dateTime={m.createdAt} className="text-[11px] text-muted">{time(m.createdAt)}</time>
                  </p>
                )}
                <p className="text-[15px] leading-relaxed break-words text-fg/90">{m.body}</p>
              </div>
              {me === m.user.username && (
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  aria-label="Mesajı sil"
                  className="shrink-0 self-start px-1 text-xs text-muted opacity-0 group-hover:opacity-100 hover:text-fg focus:opacity-100"
                >
                  Sil
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <div className="border-t border-white/[0.06] p-2.5 sm:p-3">
        {session ? (
          <form onSubmit={send} className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              aria-label="Mesajın"
              placeholder="Mesaj yaz…"
              className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-[15px] placeholder:text-muted focus:border-accent/60 focus:outline-none"
            />
            <button type="submit" disabled={sending || !text.trim()} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
              Gönder
            </button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-sm text-muted">Sohbete katılmak için giriş yap.</p>
            <Link href="/giris?geri=/sohbet" className="btn-primary px-4 py-2 text-sm">Giriş yap</Link>
          </div>
        )}
        {error && <p role="alert" className="mt-2 px-1 text-sm font-semibold text-accent">{error}</p>}
      </div>
    </div>
  );
}
