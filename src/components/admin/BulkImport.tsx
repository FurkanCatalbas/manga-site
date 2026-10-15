"use client";

import { useRef, useState } from "react";
import { createChapter, getOkutoonChapters } from "@/app/admin/actions";
import { field, label, primaryBtn, secondaryBtn } from "./ui";
import { isImageLink, measureImage } from "./upload";

type Size = { width: number; height: number };
type Row = { number: number; state: "ok" | "skip" | "missing" | "error"; text: string };

// Sayfa bulunamayana kadar ileriye doğru aynı anda denenecek görsel sayısı
const LOOKAHEAD = 6;
const MAX_PAGES = 500;
// Bitiş verilmezse art arda bu kadar bölüm bulunamayınca seri bitti sayılır
const MISSING_LIMIT = 3;

type Template = {
  chapter: number;
  /** okutoon: klasördeki bölüm kimliği tahmin edilemez, seri sayfasından okunur (`getOkutoonChapters`) */
  okutoon?: string;
  url: (ch: number, p: number, id?: number) => string;
};

/**
 * Sabit kalıplı görsel adresinden bölüm/sayfa adresi üretir:
 * `…/96238/1/0001.webp`, `…/74242/Chapter_1/split_000.webp` ya da `…/Seri-Adi/bolum-001/001.jpg` (mangaruhu).
 * Dosyanın bir üstündeki klasördeki sayı bölüm numarası (önündeki `chapter_`, `bolum-` gibi ek korunur), dosya adındaki son sayı sayfa numarasıdır (sıfır dolgusu korunur).
 * okutoon: `om-cdn.okutoon.com/chapters/<seri-no>/<bölüm-kimliği>/<seri>_bolum-<N>_<sayfa>.webp` ya da
 * `…/<seri>-<N>-<sayfa>.webp` (biçim seriden seriye değişir; dosya adındaki son iki sayı bölüm ve sayfadır).
 */
function parseTemplate(sample: string): Template | null {
  if (!isImageLink(sample)) return null;
  const u = new URL(sample);
  const o = u.hostname.endsWith("okutoon.com") && u.pathname.match(/^\/chapters\/(\d+)\/\d+\/(.*?)(\d+)([-_])(\d+)(\.[a-z]+)$/i);
  if (o) {
    const [, seriesId, prefix, chapter, sep, page, ext] = o;
    // "please-behave-my-wife_bolum-" / "a-red-knight-…-money-" → okutoon'daki seri adresi
    const name = prefix.replace(/[-_]bolum[-_]$|[-_]$/i, "");
    if (!/^[a-z0-9-]+$/.test(name)) return null;
    return {
      chapter: Number(chapter),
      okutoon: name,
      url: (ch, p, id) =>
        `${u.origin}/chapters/${seriesId}/${id}/${prefix}${ch}${sep}${String(p).padStart(page.length, "0")}${ext}`,
    };
  }
  const m = u.pathname.match(/^(.*\/[^/\d]*)(\d+)(\/[^/]*?)(\d+)(\.[a-z]+)$/i);
  if (!m) return null;
  const [, head, chapter, mid, page, ext] = m;
  // bolum-001 gibi sıfır dolgulu bölüm numaralarında dolgu korunur (bolum-1 kaynakta yok)
  const chapterWidth = chapter.startsWith("0") ? chapter.length : 0;
  return {
    chapter: Number(chapter),
    url: (ch, p) =>
      `${u.origin}${head}${String(ch).padStart(chapterWidth, "0")}${mid}${String(p).padStart(page.length, "0")}${ext}${u.search}`,
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
    if (t) setFrom(t.chapter);
  }

  async function run() {
    setError("");
    setRows([]);
    if (!template) return setError("Görsel bağlantısı …/<bölüm>/<sayfa>.webp biçiminde olmalı.");
    if (!slug) return setError("Seri seç.");
    if (!Number.isInteger(from) || from < 0 || (to.trim() && !(Number.isInteger(Number(to)) && Number(to) >= from))) {
      return setError("Bölüm aralığı 0 veya daha büyük olmalı ve küçükten büyüğe ilerlemeli.");
    }

    stopRef.current = false;
    setRunning(true);
    const add = (row: Row) => setRows((r) => [...r, row]);
    try {
      // okutoon: bölüm numarası → klasör kimliği (ondalık bölümler sitede olmadığı için atlanır)
      let ids: Map<number, number> | null = null;
      if (template.okutoon) {
        setStatus("okutoon bölüm listesi okunuyor…");
        const list = await getOkutoonChapters(template.okutoon);
        if ("error" in list) throw new Error(list.error);
        ids = new Map(list.chapters.filter((c) => Number.isInteger(c.number)).map((c) => [c.number, c.id]));
      }
      const last = to.trim() ? Number(to) : ids ? Math.max(0, ...ids.keys()) : from + 2000;

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
        const id = ids?.get(n);
        if (ids && id === undefined) {
          add({ number: n, state: "missing", text: "kaynakta bulunamadı" });
          continue;
        }
        setStatus(`${n}. bölümün sayfaları aranıyor…`);
        let pages;
        try {
          pages = await collectPages((p) => template.url(n, p, id), () => stopRef.current);
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
          Görsel adresi bölüm ve sayfa numarasıyla ilerliyorsa (ör. <code>…/96238/1/0001.webp</code>,{" "}
          <code>cdn.mangaruhu.com/…/bolum-001/001.jpg</code>) kaynak sayfayı
          açmadan bölümleri sırayla bulup yayınlar. okutoon görsel bağlantısı
          (<code>om-cdn.okutoon.com/chapters/…_bolum-1_001.webp</code> ya da <code>…-1-001.webp</code>) verilirse bölüm listesi okutoon&apos;daki
          seri sayfasından okunur. Sitede zaten olan bölümler atlanır. 0. bölüm de alınacaksa İlk bölüm&apos;e 0 yaz.
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
          <p className="mt-1 text-xs break-all text-muted">
            {template.okutoon
              ? `okutoon serisi: ${template.okutoon} (bölüm listesi okutoon.com/${template.okutoon} sayfasından okunur)`
              : `Örnek: ${template.url(Number.isInteger(from) && from >= 0 ? from : 1, 1)}`}
          </p>
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
            min={0}
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
            min={0}
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
