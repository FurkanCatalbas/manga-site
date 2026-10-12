"use client";

import { useRef, useState } from "react";
import { createChapter } from "@/app/admin/actions";
import { field, label, primaryBtn, secondaryBtn } from "./ui";
import { isImageLink, measureImage } from "./upload";

type Size = { width: number; height: number };
type Row = { number: number; state: "ok" | "skip" | "missing" | "error"; text: string };

// Sayfa bulunamayana kadar ileriye doğru aynı anda denenecek görsel sayısı
const LOOKAHEAD = 6;
const MAX_PAGES = 500;
// Bitiş verilmezse art arda bu kadar bölüm bulunamayınca seri bitti sayılır
const MISSING_LIMIT = 3;

/**
 * Sabit kalıplı görsel adresinden bölüm/sayfa adresi üretir:
 * `…/96238/1/0001.webp` ya da `…/74242/Chapter_1/split_000.webp`.
 * Dosyanın bir üstündeki klasör bölüm numarası, dosya adındaki son sayı sayfa numarasıdır (sıfır dolgusu korunur).
 */
function parseTemplate(sample: string) {
  if (!isImageLink(sample)) return null;
  const u = new URL(sample);
  const m = u.pathname.match(/^(.*\/(?:chapter[-_]?)?)(\d+)(\/[^/]*?)(\d+)(\.[a-z]+)$/i);
  if (!m) return null;
  const [, head, chapter, mid, page, ext] = m;
  return {
    chapter: Number(chapter),
    url: (ch: number, p: number) => `${u.origin}${head}${ch}${mid}${String(p).padStart(page.length, "0")}${ext}${u.search}`,
  };
}

const probe = (src: string) => measureImage(src).catch(() => null);

/**
 * Bölümün sayfalarını 0'dan (yoksa 1'den) başlayıp açılmayan ilk görsele kadar toplar.
 * Bölüm yoksa null döner. Arada tek bir sayfa açılmıyorsa yarım bölüm yayınlanmasın diye hata atar.
 */
async function collectPages(url: (p: number) => string, stopped: () => boolean) {
  const cache = new Map<number, Promise<Size | null>>();
  const get = (p: number) => {
    if (!cache.has(p)) cache.set(p, probe(url(p)));
    return cache.get(p)!;
  };
  const pages: [string, number, number][] = [];
  const start = (await get(0)) ? 0 : 1;
  for (let p = start; p < start + MAX_PAGES; p++) {
    if (stopped()) throw new Error("Durduruldu.");
    for (let k = p + 1; k <= p + LOOKAHEAD; k++) get(k);
    const size = (await get(p)) ?? (await probe(url(p)));
    if (!size) {
      if (pages.length && ((await get(p + 1)) || (await get(p + 2)))) {
        throw new Error(`${p}. görsel açılamadı ama sonrakiler var; bölüm eksik kalmasın diye yayınlanmadı.`);
      }
      break;
    }
    pages.push([url(p), size.width, size.height]);
  }
  return pages.length ? pages : null;
}

export function BulkImport({ seriesList }: { seriesList: { slug: string; title: string }[] }) {
  const [sample, setSample] = useState("");
  const [slug, setSlug] = useState("");
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);

  const template = parseTemplate(sample.trim());

  function changeSample(v: string) {
    setSample(v);
    const t = parseTemplate(v.trim());
    if (t && t.chapter > 0) setFrom(t.chapter);
  }

  async function run() {
    setError("");
    setRows([]);
    if (!template) return setError("Görsel bağlantısı …/<bölüm>/<sayfa>.webp biçiminde olmalı.");
    if (!slug) return setError("Seri seç.");
    const last = to.trim() ? Number(to) : from + 2000;
    if (!Number.isInteger(from) || from < 1 || !Number.isInteger(last) || last < from) {
      return setError("Bölüm aralığı 1 veya daha büyük olmalı ve küçükten büyüğe ilerlemeli.");
    }

    stopRef.current = false;
    setRunning(true);
    const add = (row: Row) => setRows((r) => [...r, row]);
    try {
      setStatus("Sitedeki bölümler okunuyor…");
      const res = await fetch(`/api/admin/bolum?seri=${encodeURIComponent(slug)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Bölüm listesi alınamadı (${res.status}).`);
      const existing = new Set<number>(data.chapters);

      let missing = 0;
      let published = 0;
      for (let n = from; n <= last && !stopRef.current; n++) {
        if (existing.has(n)) {
          add({ number: n, state: "skip", text: "zaten var, atlandı" });
          continue;
        }
        setStatus(`${n}. bölümün sayfaları aranıyor…`);
        let pages;
        try {
          pages = await collectPages((p) => template.url(n, p), () => stopRef.current);
        } catch (e) {
          if (stopRef.current) break;
          add({ number: n, state: "error", text: (e as Error).message });
          continue;
        }
        if (!pages) {
          add({ number: n, state: "missing", text: "kaynakta bulunamadı" });
          if (++missing >= MISSING_LIMIT) break;
          continue;
        }
        missing = 0;
        setStatus(`${n}. bölüm yayınlanıyor (${pages.length} sayfa)…`);
        const result = await createChapter({
          slug,
          number: n,
          title: "",
          pages: pages.map((p) => p[0]),
          pageSizes: pages.map((p) => [p[1], p[2]]),
        });
        if (result?.ok) {
          published++;
          add({ number: n, state: "ok", text: `${pages.length} sayfa yayınlandı` });
        } else {
          add({ number: n, state: "error", text: result?.error ?? "Yayınlanamadı." });
        }
      }
      setStatus(stopRef.current ? `Durduruldu. ${published} bölüm yayınlandı.` : `Bitti. ${published} bölüm yayınlandı.`);
    } catch (e) {
      setError((e as Error).message);
      setStatus("");
    } finally {
      setRunning(false);
    }
  }

  const tone: Record<Row["state"], string> = {
    ok: "text-fresh",
    skip: "text-muted",
    missing: "text-muted",
    error: "text-accent",
  };

  return (
    <div className="panel grid gap-4 p-5">
      <div>
        <h2 className="text-lg font-bold">Toplu al (sabit adresli siteler)</h2>
        <p className="mt-1 text-sm text-muted">
          Görsel adresi bölüm ve sayfa numarasıyla ilerliyorsa (ör. <code>…/96238/1/0001.webp</code>) kaynak sayfayı
          açmadan bölümleri sırayla bulup yayınlar. Sitede zaten olan bölümler atlanır.
        </p>
      </div>
      <div>
        <label htmlFor="bulk-sample" className={label}>Herhangi bir sayfanın görsel bağlantısı</label>
        <input
          id="bulk-sample"
          value={sample}
          onChange={(e) => changeSample(e.target.value)}
          placeholder="https://c1.skycdn.online/init-manga/96238/1/0001.webp"
          disabled={running}
          className={field}
        />
        {sample.trim() && !template && (
          <p className="mt-1 text-xs text-accent">Bağlantıda …/&lt;bölüm&gt;/&lt;sayfa&gt;.webp kalıbı bulunamadı.</p>
        )}
        {template && (
          <p className="mt-1 text-xs break-all text-muted">Örnek: {template.url(from || 1, 1)}</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_120px_120px]">
        <div>
          <label htmlFor="bulk-series" className={label}>Seri</label>
          <select
            id="bulk-series"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={running}
            className={field}
          >
            <option value="">Seç…</option>
            {seriesList.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.title} ({s.slug})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bulk-from" className={label}>İlk bölüm</label>
          <input
            id="bulk-from"
            type="number"
            min={1}
            value={from}
            onChange={(e) => setFrom(Number(e.target.value))}
            disabled={running}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="bulk-to" className={label}>Son bölüm</label>
          <input
            id="bulk-to"
            type="number"
            min={1}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="sonuna kadar"
            disabled={running}
            className={field}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {running ? (
          <button type="button" onClick={() => (stopRef.current = true)} className={secondaryBtn}>
            Durdur
          </button>
        ) : (
          <button type="button" onClick={run} className={primaryBtn}>
            Bul ve yayınla
          </button>
        )}
        {status && <p className="text-sm font-semibold">{status}</p>}
        {error && <p role="alert" className="font-semibold text-accent">{error}</p>}
      </div>
      {rows.length > 0 && (
        <ol className="grid gap-1 text-sm">
          {rows.map((r) => (
            <li key={r.number} className={tone[r.state]}>
              <span className="font-semibold">{r.number}. bölüm:</span> {r.text}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
