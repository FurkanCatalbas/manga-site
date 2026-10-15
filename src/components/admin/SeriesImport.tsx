"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createChapter } from "@/app/admin/actions";
import { COMMENTS, MAP_KEY, READER, readMap } from "./ChapterImport";
import { field, label, primaryBtn } from "./ui";
import { isImageLink, measureImage } from "./upload";

/** Yer iminin topladığı bölüm: numara, kaynak adres, [url, genişlik, yükseklik][], görsel yoksa nedeni */
type SourceChapter = { n: number; u: string; p: [string, number, number][]; e?: string };
type Payload = { s: string; src: string; chapters: SourceChapter[] };
type RowState = { state: "ok" | "skip" | "error" | "busy"; text: string };

// Reklam kutuları (mangaruhu bölüm başı/sonu afişi gibi) okuyucu kutusunun içinde olabiliyor
const ADS = "[class*=chapter-ad],[class*=-ads],[id*=-ads],[class*=advert]";

/**
 * Kaynak sitede çalışan "seri" yer imi. Bulunduğu bölüm (ya da seri) sayfasının adresinden
 * `…/bolum-<N>/` kalıbını çıkarır, sorulan aralıktaki bölüm sayfalarını kullanıcının kendi oturumuyla
 * (aynı siteden `fetch`) sırayla okur ve görsel adreslerini panele `postMessage` ile yollar.
 * Görsel adresleri sırayla artmayan siteler (hash'li klasör, rastgele dosya adı) bu yüzden alınabilir.
 * Görselleri sayfadaki kodla şifreleyip sonradan çizen siteler (paradoxscans) HTML'de görsel vermez;
 * o bölümler "görsel yok" olarak döner, tek bölüm yer imiyle alınmalı. Doğrulama sayfası gelirse durur.
 */
const SOURCE_SCRIPT = String.raw`async (o) => {
  const ui = document.createElement('div');
  ui.style.cssText = 'position:fixed;z-index:2147483647;top:12px;right:12px;max-width:340px;padding:12px 16px;border-radius:12px;background:#15121c;color:#fff;font:600 14px/1.4 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5)';
  const say = (t) => { ui.textContent = 'webtooku: ' + t; };
  document.documentElement.appendChild(ui);
  // Reklamlı siteler window.open/alert/prompt'u değiştirebiliyor; temiz kopyaları boş bir iframe'den alınır
  const f = document.createElement('iframe');
  f.style.display = 'none';
  document.documentElement.appendChild(f);
  const clean = f.contentWindow || window;
  const done = () => { f.remove(); setTimeout(() => ui.remove(), 10000); };
  const fail = (t) => { say(t); try { clean.alert('webtooku: ' + t); } catch (_) {} done(); };
  const re = /^(.*\/(?:bolum|chapter|ch)[-_]?)(\d+)(\/?)$/i;
  let m = location.pathname.match(re);
  const known = new Map();
  for (const a of document.links) {
    const k = a.origin === location.origin && a.pathname.match(re);
    if (k && (!m ? a.pathname.startsWith(location.pathname) : k[1] === m[1])) {
      if (!m) m = k;
      if (k[1] === m[1]) known.set(+k[2], a.href);
    }
  }
  if (!m) return fail('Bu sayfada bölüm adresi (…/bolum-1/) bulunamadı. Serinin bir bölümünü açıp tekrar dene.');
  const [, prefix, cur, tail] = m;
  const width = cur.startsWith('0') ? cur.length : 0;
  const urlOf = (n) => known.get(n) || location.origin + prefix + String(n).padStart(width, '0') + tail;
  const nums = [...known.keys()];
  const from = location.pathname.match(re) ? +cur : Math.min(...nums);
  const max = Math.max(from, ...nums);
  let w = null;
  try { w = clean.open(o.origin + '/admin/al#toplu'); } catch (_) {}
  if (!w) { try { w = window.open(o.origin + '/admin/al#toplu'); } catch (_) {} }
  if (!w) return fail('Panel açılamadı: açılır pencere engellendi. Adres çubuğundaki simgeden bu siteye açılır pencere izni verip tekrar dene.');
  // Panel hazır olunca açan pencereye (iframe ya da sayfa) haber verir; ikisi de dinlenir
  let ready = false;
  const panelReady = new Promise((res) => {
    const on = (e) => { if (e.source === w && e.origin === o.origin && e.data && e.data.type === 'webtooku-hazir') { ready = true; res(); } };
    addEventListener('message', on);
    if (clean !== window) clean.addEventListener('message', on);
  });
  const ask = (q, d) => { try { return clean.prompt(q, d); } catch (_) { return prompt(q, d); } };
  const answer = ask('Hangi bölümler alınsın? Örnek: 1-50 ya da 12- (sonuna kadar)', from + '-' + (max > from ? max : ''));
  if (answer === null) { w.close(); say('İptal edildi.'); return done(); }
  const r = answer.trim().match(/^(\d+)\s*(?:-\s*(\d*))?$/);
  if (!r) { w.close(); return fail('Aralık anlaşılamadı: ' + answer); }
  const first = +r[1];
  // Açık uçlu aralık sayfadaki son bölümün biraz ötesine kadar gider
  const last = r[2] === undefined ? first : r[2] === '' ? Math.max(first, max) + 3 : +r[2];
  const tell = (t) => { say(t); if (ready) w.postMessage({ type: 'webtooku-ilerleme', text: t }, o.origin); };
  const bad = (i) => { const c = i.closest(o.comments); return !!c && c !== i.ownerDocument.body && c !== i.ownerDocument.documentElement; };
  // Okuyucuda görünmeyen görseller (bazı siteler araya gizli sahte görsel koyuyor) alınmaz
  const hidden = (i) => {
    for (let e = i; e && e.nodeType === 1; e = e.parentElement) {
      const s = (e.getAttribute('style') || '').replace(/\s/g, '').toLowerCase();
      if (e.hidden || s.includes('display:none') || s.includes('visibility:hidden')) return true;
    }
    return false;
  };
  const pick = (doc, base) => {
    let imgs = [...doc.querySelectorAll('img[data-imc-order]')];
    if (!imgs.length) imgs = [...doc.querySelectorAll(o.reader)];
    const seen = new Set();
    let out = [];
    for (const i of imgs) {
      if (bad(i) || hidden(i) || i.closest(o.ads)) continue;
      const raw = [i.getAttribute('data-original-src'), i.getAttribute('data-src'), i.getAttribute('data-lazy-src'), i.getAttribute('src')]
        .map((s) => (s || '').trim()).find((s) => s && !s.startsWith('data:'));
      if (!raw) continue;
      let src;
      try { src = new URL(raw, base).href; } catch (_) { continue; }
      if (!src.startsWith('https:') || seen.has(src)) continue;
      seen.add(src);
      out.push([src, +i.getAttribute('width') || 0, +i.getAttribute('height') || 0]);
    }
    // Sayfaların çoğu tek sunucudaysa başka sunucudaki afiş/reklam görselleri atılır
    const hosts = new Map();
    for (const x of out) { const h = new URL(x[0]).host; hosts.set(h, (hosts.get(h) || 0) + 1); }
    const top = [...hosts].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= out.length * 0.8) out = out.filter((x) => new URL(x[0]).host === top[0]);
    return out;
  };
  const chapters = [];
  // Art arda bulunamayan ya da görselsiz bölüm sayısı; 3 olunca durulur (bazı siteler olmayan bölüme 200 döner)
  let missing = 0;
  let stop = '';
  for (let n = first; n <= last && !stop; n++) {
    if (n > first) await new Promise((res) => setTimeout(res, 400));
    const u = urlOf(n);
    tell(n + '. bölüm okunuyor… (' + chapters.filter((c) => c.p.length).length + ' bölüm bulundu)');
    let res;
    try { res = await fetch(u, { credentials: 'include' }); } catch (_) { stop = n + '. bölüm açılamadı (bağlantı hatası).'; break; }
    // Olmayan bölüm başka sayfaya (seri sayfası, ana sayfa) yönlendirilebiliyor
    const moved = res.redirected && !re.test(new URL(res.url).pathname);
    if (res.status === 404 || res.status === 410 || moved) {
      if (++missing >= 3) break;
      continue;
    }
    const html = await res.text();
    if (res.status === 403 || res.status === 503 || /Just a moment|cf-chl|challenge-platform\/h\//.test(html)) {
      stop = 'Site doğrulama istedi (' + n + '. bölümde durdu). Bu sekmeyi yenileyip doğrulamayı geç, kalan bölümler için yer imine tekrar tıkla.';
      break;
    }
    if (!res.ok) { chapters.push({ n, u, p: [], e: 'kaynak ' + res.status + ' döndü' }); continue; }
    const p = pick(new DOMParser().parseFromString(html, 'text/html'), u);
    if (p.length) missing = 0;
    else if (++missing >= 3 && !known.has(n)) break;
    chapters.push(p.length ? { n, u, p } : { n, u, p: [], e: 'sayfada görsel yok (kilitli ya da şifreli olabilir)' });
  }
  // Sondaki görselsiz bölümler (olmayan bölümler için gelen boş sayfalar) listeye alınmaz
  while (chapters.length && !chapters[chapters.length - 1].p.length && !known.has(chapters[chapters.length - 1].n)) chapters.pop();
  const found = chapters.filter((c) => c.p.length).length;
  say(found + ' bölüm bulundu, panele gönderiliyor…');
  const ok = await Promise.race([panelReady.then(() => true), new Promise((res) => setTimeout(() => res(false), 20000))]);
  if (!ok || w.closed) return fail('Panel yanıt vermedi. Panel sekmesinde giriş yapmış olduğundan emin ol, sonra yer imine tekrar tıkla.');
  const seg = prefix.split('/').filter(Boolean);
  w.postMessage({ type: 'webtooku-seri', stop, data: { s: seg.length > 1 ? seg[seg.length - 2] : '', src: location.origin + prefix, chapters } }, o.origin);
  say(found + ' bölüm panele gönderildi.' + (stop ? ' ' + stop : ''));
  done();
}`;

function bookmarklet(origin: string) {
  const args = JSON.stringify({ origin, reader: READER, comments: COMMENTS, ads: ADS });
  return "javascript:" + encodeURIComponent(`(${SOURCE_SCRIPT})(${args}).catch(e=>alert('webtooku: '+e.message));void 0`);
}

const MEASURE_WORKERS = 6;

/** Sayfaları en fazla 6'şar açıp ölçer; açılmayanların sırasını (1'den) döner. */
async function measureAll(urls: string[]) {
  const sizes: [number, number][] = new Array(urls.length);
  const failed: number[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: MEASURE_WORKERS }, async () => {
      while (next < urls.length) {
        const i = next++;
        try {
          const { width, height } = await measureImage(urls[i]);
          sizes[i] = [width, height];
        } catch {
          failed.push(i + 1);
        }
      }
    }),
  );
  return { sizes, failed: failed.sort((a, b) => a - b) };
}

export function SeriesImport({ seriesList }: { seriesList: { slug: string; title: string }[] }) {
  const [waiting, setWaiting] = useState(false);
  const [progress, setProgress] = useState("");
  const [stopNote, setStopNote] = useState("");
  const [data, setData] = useState<Payload | null>(null);
  const [slug, setSlug] = useState("");
  const [existing, setExisting] = useState<Set<number> | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [head, setHead] = useState(0);
  const [tail, setTail] = useState(0);
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const linkRef = useRef<HTMLAnchorElement>(null);

  // Yer imi paneli #toplu ile açar; veri sunucuya gitmez, açan sekmeden postMessage ile gelir
  useEffect(() => {
    linkRef.current?.setAttribute("href", bookmarklet(location.origin));
    if (location.hash !== "#toplu") return;
    if (!window.opener) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- yalnızca tarayıcıda bilinebilir */
      setError("Kaynak sekmeyle bağlantı kurulamadı. Bu sekmeyi kapatıp kaynak sitede yer imine tekrar tıkla.");
      history.replaceState(null, "", location.pathname);
      return;
    }
    setWaiting(true);
    const source = window.opener as Window;
    function onMessage(e: MessageEvent) {
      if (e.source !== source || !e.data || typeof e.data !== "object") return;
      if (e.data.type === "webtooku-ilerleme") setProgress(String(e.data.text ?? ""));
      if (e.data.type === "webtooku-seri") {
        const d = e.data.data as Payload;
        if (!Array.isArray(d?.chapters)) return;
        const chapters = d.chapters
          .filter((c) => Number.isFinite(c?.n) && Array.isArray(c.p))
          .map((c) => ({ n: c.n, u: String(c.u ?? ""), p: c.p.filter((x) => isImageLink(String(x?.[0] ?? ""))), e: c.e }));
        setData({ s: String(d.s ?? ""), src: String(d.src ?? ""), chapters });
        setStopNote(String(e.data.stop ?? ""));
        const s = String(d.s ?? "");
        const map = readMap();
        const known = Object.hasOwn(map, s) ? String(map[s]) : seriesList.some((x) => x.slug === s) ? s : "";
        setSlug(known);
        setWaiting(false);
        clearInterval(ping);
        history.replaceState(null, "", location.pathname);
      }
    }
    addEventListener("message", onMessage);
    // Kaynak sekme dinlemeye geç başlayabilir; veri gelene kadar ara ara haber verilir
    const hello = () => source.postMessage({ type: "webtooku-hazir" }, "*");
    hello();
    const ping = setInterval(hello, 1000);
    return () => {
      clearInterval(ping);
      removeEventListener("message", onMessage);
    };
  }, [seriesList]);

  // Seri seçilince sitede olan bölümler okunur; olmayan ve görseli bulunan bölümler işaretlenir
  useEffect(() => {
    if (!slug || !data) return;
    let cancelled = false;
    fetch(`/api/admin/bolum?seri=${encodeURIComponent(slug)}`)
      .then((r) => r.json().then((j) => (r.ok ? j : Promise.reject(new Error(j.error ?? `Bölüm listesi alınamadı (${r.status}).`)))))
      .then((j: { chapters: number[] }) => {
        if (cancelled) return;
        const have = new Set(j.chapters);
        setExisting(have);
        setPicked(new Set(data.chapters.filter((c) => c.p.length && !have.has(c.n)).map((c) => c.n)));
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [slug, data]);

  function toggle(n: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(n)) next.add(n);
      return next;
    });
  }

  async function publish() {
    if (!data || !slug) return setError("Seri seç.");
    setError("");
    setRunning(true);
    const set = (n: number, r: RowState) => setRows((prev) => ({ ...prev, [n]: r }));
    let published = 0;
    for (const c of data.chapters) {
      if (!picked.has(c.n)) continue;
      const pages = c.p.slice(head, c.p.length - tail).map((x) => x[0]);
      if (!pages.length) {
        set(c.n, { state: "error", text: "çıkarılanlardan sonra sayfa kalmadı" });
        continue;
      }
      set(c.n, { state: "busy", text: `${pages.length} sayfa kontrol ediliyor…` });
      const { sizes, failed } = await measureAll(pages);
      if (failed.length) {
        set(c.n, { state: "error", text: `açılmayan sayfalar: ${failed.join(", ")}` });
        continue;
      }
      const result = await createChapter({ slug, number: c.n, title: "", pages, pageSizes: sizes });
      if (result?.ok) {
        published++;
        set(c.n, { state: "ok", text: `${pages.length} sayfa yayınlandı` });
        setPicked((prev) => {
          const next = new Set(prev);
          next.delete(c.n);
          return next;
        });
        setExisting((prev) => new Set(prev).add(c.n));
      } else {
        set(c.n, { state: "error", text: result?.error ?? "Yayınlanamadı." });
      }
    }
    if (published && data.s) localStorage.setItem(MAP_KEY, JSON.stringify({ ...readMap(), [data.s]: slug }));
    setRunning(false);
  }

  const tone: Record<RowState["state"], string> = {
    ok: "text-fresh",
    skip: "text-muted",
    busy: "text-fg",
    error: "text-accent",
  };

  const install = (
    <div className="panel grid gap-3 p-5">
      <h2 className="text-lg font-bold">Seriyi bölüm bölüm al (yer imi)</h2>
      <p className="text-sm text-muted">
        Görsel adresleri sırayla artmayan siteler için (webtoonhatti, mangaruhu…). Yer imi, kaynak sitede açtığın
        bölümün adresinden <code>…/bolum-1/</code>, <code>…/bolum-2/</code> sayfalarını senin tarayıcında sırayla okur ve
        görsel bağlantılarını buraya getirir. Görseller R2&apos;ye yüklenmez.
      </p>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
        <li>Aşağıdaki düğmeyi yer imleri çubuğuna sürükle.</li>
        <li>Kaynak sitede serinin herhangi bir bölümünü ya da seri sayfasını aç, yer imine tıkla.</li>
        <li>Hangi bölümlerin alınacağını yaz (ör. <code>1-50</code>). Panel yeni sekmede açılır, bölümler gelince yayınlarsın.</li>
      </ol>
      <div>
        <a
          ref={linkRef}
          onClick={(e) => e.preventDefault()}
          className="inline-block cursor-grab rounded-lg bg-accent px-4 py-2 font-semibold text-white"
        >
          webtooku&apos;ya seri gönder
        </a>
      </div>
      <p className="text-xs text-muted">
        Kilitli (VIP) bölümler ve görselleri sayfada şifreli gelen siteler (paradoxscans) &quot;görsel yok&quot; diye
        atlanır; onları tek bölüm yer imiyle al. Site doğrulama isterse yer imi durur.
      </p>
    </div>
  );

  if (waiting) {
    return (
      <div className="panel grid gap-2 p-5">
        <h2 className="text-lg font-bold">Kaynak siteden bölümler bekleniyor…</h2>
        <p className="text-sm text-muted">{progress || "Kaynak sekmede bölüm aralığını onayla."}</p>
      </div>
    );
  }
  if (!data)
    return error ? (
      <div className="grid gap-3">
        <p role="alert" className="font-semibold text-accent">{error}</p>
        {install}
      </div>
    ) : (
      install
    );

  const withImages = data.chapters.filter((c) => c.p.length);
  return (
    <div className="panel grid gap-4 p-5">
      <div>
        <h2 className="text-lg font-bold">Seriden gelen bölümler</h2>
        <p className="mt-1 text-sm break-all text-muted">
          Kaynak: {data.src}… · {withImages.length} bölümde görsel bulundu
        </p>
        {stopNote && <p className="mt-2 text-sm font-semibold text-accent">{stopNote}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_140px_140px]">
        <div>
          <label htmlFor="ser-series" className={label}>Seri</label>
          <select
            id="ser-series"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setExisting(null);
              setRows({});
            }}
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
          {data.s && !slug && (
            <p className="mt-1 text-xs text-muted">Kaynaktaki adı &quot;{data.s}&quot;. Bir kez seçince hatırlanır.</p>
          )}
        </div>
        <div>
          <label htmlFor="ser-head" className={label}>Baştan çıkar</label>
          <input id="ser-head" type="number" min={0} value={head} onChange={(e) => setHead(Math.max(0, Number(e.target.value) || 0))} disabled={running} className={field} />
        </div>
        <div>
          <label htmlFor="ser-tail" className={label}>Sondan çıkar</label>
          <input id="ser-tail" type="number" min={0} value={tail} onChange={(e) => setTail(Math.max(0, Number(e.target.value) || 0))} disabled={running} className={field} />
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted">
        Her bölümün başındaki/sonundaki ekip tanıtımı ya da reklam sayfalarını atmak için. Önce bir bölümü kaynağından
        açıp kaç sayfa olduğuna bak.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={publish} disabled={running || !slug || !picked.size} className={primaryBtn}>
          {running ? "Yayınlanıyor…" : `Seçilen ${picked.size} bölümü yayınla`}
        </button>
        {error && <p role="alert" className="font-semibold text-accent">{error}</p>}
        {slug && Object.values(rows).some((r) => r.state === "ok") && (
          <Link href={`/seri/${slug}`} className="font-semibold underline underline-offset-4">
            Sitede gör
          </Link>
        )}
      </div>
      <ul className="grid gap-1 text-sm">
        {data.chapters.map((c) => {
          const row = rows[c.n];
          const have = existing?.has(c.n) && row?.state !== "ok";
          const note = row?.text ?? (c.e ? c.e : have ? "sitede zaten var" : `${c.p.length} sayfa`);
          return (
            <li key={c.n} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={picked.has(c.n)}
                onChange={() => toggle(c.n)}
                disabled={running || !c.p.length || !existing || have || row?.state === "ok"}
                aria-label={`${c.n}. bölümü seç`}
                className="size-4 accent-[var(--color-accent)]"
              />
              <a href={c.u} target="_blank" rel="noopener noreferrer" className="w-24 shrink-0 font-semibold hover:underline">
                {c.n}. bölüm
              </a>
              <span className={row ? tone[row.state] : c.e || have ? "text-muted" : ""}>{note}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
