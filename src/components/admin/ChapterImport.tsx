"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { createChapter } from "@/app/admin/actions";
import { dangerBtn, field, label, primaryBtn, secondaryBtn } from "./ui";
import { isImageLink, measureImage } from "./upload";

/** Yer iminin gönderdiği bölüm: kaynak adres, kaynak sitedeki seri adresi, bölüm no, [url, genişlik, yükseklik][] */
type Payload = { u: string; s: string; n: string; p: [string, number, number][] };

// Kaynak sitedeki seri adresi → webtooku seri adresi (bir kez seçilince hatırlanır)
const MAP_KEY = "webtooku:kaynak-seri";

/**
 * Kaynak sitede çalışan yer imi. Önce bilinen okuyucu kutuları (`READER`) aranır. Bulunamazsa sayfadaki
 * büyük görsellerden yorum alanlarındakiler (`COMMENTS`) atılır ve görsellerin en az %70'ini içeren en içteki
 * kutu okuyucu sayılır; kutu dışındaki görseller (yorumlar, kenar çubuğu) alınmaz. Toplanan liste bu sayfa
 * adresin # kısmında (sunucuya gitmez) veriyle yeni sekmede açılır.
 */
const READER =
  "img.reader-page,#chapter-content img,#readerarea img,.reading-content img,.chapter-content img,.wp-manga-chapter-img,.container-chapter-reader img,#chapter-reader img";
const COMMENTS =
  "[id*=comment],[class*=comment],[id*=disqus],[class*=disqus],[id*=yorum],[class*=yorum],[class*=reply],[class*=avatar]";

function bookmarklet(origin: string) {
  const code = `(()=>{
const bad=i=>{const c=i.closest('${COMMENTS}');return !!c&&c!==document.body&&c!==document.documentElement};
let imgs=[...document.querySelectorAll('${READER}')].filter(i=>!bad(i));
if(!imgs.length){
const big=[...document.images].filter(i=>i.naturalWidth>=400);
imgs=big.filter(i=>!bad(i));
if(!imgs.length)imgs=big;
const n=new Map();
imgs.forEach(i=>{for(let e=i.parentElement;e;e=e.parentElement)n.set(e,(n.get(e)||0)+1)});
let box=null,depth=-1;
n.forEach((c,e)=>{if(c>=imgs.length*.7){let k=0;for(let x=e;x;x=x.parentElement)k++;if(k>depth){depth=k;box=e}}});
if(box)imgs=imgs.filter(i=>box.contains(i));
}
const p=imgs.map(i=>[[i.dataset.originalSrc,i.currentSrc,i.src,i.dataset.src].find(u=>/^https:/.test(u||''))||'',+i.getAttribute('width')||i.naturalWidth||0,+i.getAttribute('height')||i.naturalHeight||0]).filter(x=>/^https:/.test(x[0]));
if(!p.length){alert('Bu sayfada bölüm görseli bulunamadı.');return}
const m=location.pathname.match(/\\/([^/]+)\\/(?:bolum|chapter|ch)[-_]?(\\d+(?:\\.\\d+)?)/i);
window.open('${origin}/admin/al#'+encodeURIComponent(JSON.stringify({u:location.href,s:m?m[1]:'',n:m?m[2]:'',p})));
})()`;
  return "javascript:" + encodeURIComponent(code.replace(/\n/g, ""));
}

function readHash(): Payload | null {
  if (!location.hash) return null;
  try {
    const d = JSON.parse(decodeURIComponent(location.hash.slice(1)));
    if (!Array.isArray(d?.p) || !d.p.length) return null;
    return { u: String(d.u ?? ""), s: String(d.s ?? ""), n: String(d.n ?? ""), p: d.p };
  } catch {
    return null;
  }
}

function readMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(MAP_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function ChapterImport({ seriesList }: { seriesList: { slug: string; title: string }[] }) {
  const [data, setData] = useState<Payload | null>(null);
  // Yer iminin gönderdiği ilk liste: çıkarılan sayfalar buradan geri getirilir
  const [original, setOriginal] = useState<Payload["p"]>([]);
  // Çıkarılmak üzere seçilen sayfaların sırası (0'dan)
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [ready, setReady] = useState(false);
  const [slug, setSlug] = useState("");
  const [number, setNumber] = useState(1);
  const [title, setTitle] = useState("");
  const [done, setDone] = useState(0);
  const [message, setMessage] = useState<{ error?: string; ok?: string }>();
  const [published, setPublished] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const linkRef = useRef<HTMLAnchorElement>(null);

  // # verisi ve hatırlanan seri yalnızca tarayıcıda okunabilir
  useEffect(() => {
    const d = readHash();
    /* eslint-disable react-hooks/set-state-in-effect -- tarayıcıya özgü veri ilk çizimden sonra okunur */
    setData(d);
    if (d) {
      setOriginal(d.p);
      const known = readMap()[d.s] ?? (seriesList.some((s) => s.slug === d.s) ? d.s : "");
      setSlug(known);
      // Boş numara 0. bölüm sayılmasın (Number("") === 0)
      const n = String(d.n ?? "").trim() ? Number(d.n) : NaN;
      if (Number.isInteger(n) && n >= 0) setNumber(n);
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // React javascript: bağlantılarını engellediği için yer imi adresi doğrudan DOM'a yazılır
    linkRef.current?.setAttribute("href", bookmarklet(location.origin));
  }, [seriesList]);

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(i)) next.add(i);
      return next;
    });
  }

  function removeSelected() {
    setData((d) => d && { ...d, p: d.p.filter((_, i) => !selected.has(i)) });
    setSelected(new Set());
    setMessage(undefined);
  }

  function restoreAll() {
    setData((d) => d && { ...d, p: original });
    setSelected(new Set());
    setMessage(undefined);
  }

  function publish() {
    if (!data) return;
    setMessage(undefined);
    setDone(0);
    const pages = data.p.map((x) => String(x[0]));
    if (!pages.length) return setMessage({ error: "Yayınlanacak sayfa kalmadı." });
    if (!slug) return setMessage({ error: "Seri seç." });
    if (!pages.every(isImageLink)) return setMessage({ error: "https:// ile başlamayan görsel bağlantısı var." });
    startTransition(async () => {
      // Her görsel tarayıcıda denenir: sitede açılmayacak bölüm yayınlanmasın
      const sizes = await Promise.allSettled(pages.map((u) => measureImage(u).finally(() => setDone((d) => d + 1))));
      const failed = sizes.map((r, i) => (r.status === "rejected" ? i + 1 : 0)).filter(Boolean);
      if (failed.length) {
        setMessage({
          error: `Şu sayfalar açılamadı: ${failed.join(", ")}. Kaynak site dışarıdan gösterilmesini engelliyor olabilir.`,
        });
        return;
      }
      const result = await createChapter({
        slug,
        number,
        title,
        pages,
        pageSizes: sizes.map((r) => {
          const { width, height } = (r as PromiseFulfilledResult<{ width: number; height: number }>).value;
          return [width, height];
        }),
      });
      setMessage(result);
      if (result?.ok) {
        if (data.s) localStorage.setItem(MAP_KEY, JSON.stringify({ ...readMap(), [data.s]: slug }));
        setPublished(`/seri/${slug}/bolum/${number}`);
        history.replaceState(null, "", location.pathname);
      }
    });
  }

  const install = (
    <div className="panel grid gap-3 p-5">
      <h2 className="text-lg font-bold">Yer imini kur</h2>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
        <li>Chrome&apos;da yer imleri çubuğunu aç (Ctrl+Shift+B).</li>
        <li>Aşağıdaki düğmeyi sürükleyip yer imleri çubuğuna bırak.</li>
        <li>Okutoon&apos;da bir bölüm aç, sayfalar yüklenince yer imine tıkla. Bölüm burada yeni sekmede açılır.</li>
      </ol>
      <div>
        <a
          ref={linkRef}
          onClick={(e) => e.preventDefault()}
          className="inline-block cursor-grab rounded-lg bg-accent px-4 py-2 font-semibold text-white"
        >
          webtooku&apos;ya gönder
        </a>
      </div>
      <p className="text-xs text-muted">
        Yer imi şifre taşımaz; yayın bu paneldeki oturumunla yapılır. Panelde giriş yapmış olman yeter.
      </p>
    </div>
  );

  if (!ready) return install;
  if (!data) return install;

  return (
    <div className="grid gap-6">
      <div className="panel grid gap-4 p-5">
        <p className="text-sm break-all text-muted">
          Kaynak: <a href={data.u} target="_blank" rel="noopener noreferrer" className="underline">{data.u}</a>
        </p>
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <div>
            <label htmlFor="imp-series" className={label}>Seri</label>
            <select id="imp-series" value={slug} onChange={(e) => setSlug(e.target.value)} className={field}>
              <option value="">Seç…</option>
              {seriesList.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.title} ({s.slug})
                </option>
              ))}
            </select>
            {data.s && !slug && (
              <p className="mt-1 text-xs text-muted">
                Kaynaktaki adı &quot;{data.s}&quot;. Bir kez seçince sonraki bölümlerde hatırlanır.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="imp-number" className={label}>Bölüm no</label>
            <input
              id="imp-number"
              type="number"
              min={0}
              value={number}
              onChange={(e) => setNumber(Number(e.target.value))}
              className={field}
            />
          </div>
        </div>
        <div>
          <label htmlFor="imp-title" className={label}>Bölüm adı (isteğe bağlı)</label>
          <input id="imp-title" value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={publish}
            disabled={pending || !!published || !data.p.length}
            className={primaryBtn}
          >
            {pending ? `Kontrol ediliyor… ${done}/${data.p.length}` : `${number}. bölümü yayınla`}
          </button>
          {message?.error && <p role="alert" className="font-semibold text-accent">{message.error}</p>}
          {message?.ok && <p className="font-semibold text-fresh">{message.ok}</p>}
          {published && (
            <Link href={published} className="font-semibold underline underline-offset-4">
              Sitede gör
            </Link>
          )}
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold">
            {data.p.length} sayfa
            {original.length > data.p.length && (
              <span className="font-normal text-muted"> ({original.length - data.p.length} çıkarıldı)</span>
            )}
          </p>
          {selected.size > 0 && (
            <>
              <button type="button" onClick={removeSelected} disabled={pending || !!published} className={dangerBtn}>
                Seçilenleri çıkar ({selected.size})
              </button>
              <button type="button" onClick={() => setSelected(new Set())} className={secondaryBtn}>
                Seçimi temizle
              </button>
            </>
          )}
          {original.length > data.p.length && !published && (
            <button type="button" onClick={restoreAll} disabled={pending} className={secondaryBtn}>
              Hepsini geri getir
            </button>
          )}
        </div>
        {!published && (
          <p className="mb-3 text-xs text-muted">
            Reklam, ekip tanıtımı gibi istemediğin sayfalara dokunup seç, sonra &quot;Seçilenleri çıkar&quot;a bas.
          </p>
        )}
        <ol className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
          {data.p.map(([u], i) => {
            const on = selected.has(i);
            return (
              <li key={`${u}-${i}`}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  disabled={pending || !!published}
                  aria-pressed={on}
                  aria-label={`${i + 1}. sayfayı ${on ? "seçimden çıkar" : "seç"}`}
                  className={`relative block w-full overflow-hidden rounded-lg border bg-surface text-xs disabled:cursor-default ${
                    on ? "border-accent ring-2 ring-accent" : "border-line hover:border-white/30"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    referrerPolicy="no-referrer"
                    src={u}
                    alt=""
                    loading="lazy"
                    className={`aspect-[2/3] w-full object-cover object-top ${on ? "opacity-40" : ""}`}
                  />
                  {on && (
                    <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-accent text-sm font-bold text-white">
                      ✕
                    </span>
                  )}
                  <p className={`border-t py-1 text-center font-semibold ${on ? "border-accent text-accent" : "border-line"}`}>
                    {i + 1}
                  </p>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
