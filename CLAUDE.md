@AGENTS.md

# webtooku: proje rehberi (yapay zekâ asistanları için)

Bu dosya, projede çalışacak asistanın kodu baştan incelemeden işe başlayabilmesi içindir.
Yapı ya da kurallar değişince bu dosyayı da güncelle. Sonundaki "Yapılanlar" ve "Sıradakiler"
bölümlerini her iş bitince güncel tut.

## Proje

Türkçe webtoon/manga okuma sitesi. Marka adı **webtooku** (`src/lib/site.ts`). Arayüz metinleri,
kod yorumları, commit mesajları ve URL'ler Türkçedir (`/seri/[slug]/bolum/[no]`, `/ara`, `/admin/giris`).
Yeni kod da bu dile ve üsluba uymalı.

- **Next.js 16** (App Router, `cacheComponents: true`), **React 19**, **Tailwind 4**, TypeScript
- **Neon Postgres** + **Drizzle ORM** (`drizzle-orm/neon-http` sürücüsü)
- **Cloudflare R2**: görseller (`src/lib/r2.ts`)
- **Vercel**: yayın. `main`'e gönderilen her şey canlıya çıkar.

## Çalışma düzeni

- Doğrudan **`main`** üzerinde çalışılıyor; kullanıcı bunu açıkça istedi. Branch ya da PR açma.
- Commit ve push öncesi: `npx tsc --noEmit` ve `npm run lint`.
- `tsc` "Cannot find name 'PageProps' / 'LayoutProps'" hatası verirse Next'in ürettiği tipler eksik
  demektir: `npx next typegen`. `.next/` içinde kalmış eski tipler hata verirse `.next` silinip tekrar üretilir.
- Kullanıcı Türkçe konuşuyor; yanıtlar Türkçe.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run lint` | ESLint |
| `npm run db:push` | Şemayı (`src/db/schema.ts`) veritabanına uygular. Şema her değiştiğinde yayından **önce** çalıştırılmalı. |
| `npm run db:seed` | Örnek serileri ekler (görseller `public/sample`) |
| `npm run samples` | `public/sample` altındaki örnek SVG'leri üretir |
| `npm run db:backfill-sizes` | Sayfa boyutu kayıtlı olmayan eski bölümlerin boyutlarını okuyup kaydeder |
| `npm run db:studio` | Drizzle Studio |
| `npx tsx scripts/r2-check.ts` | R2 bağlantısını dener |

## Ortam değişkenleri (`.env.local`)

- `DATABASE_URL`: Neon bağlantısı (zorunlu; yoksa `src/db/index.ts` hata atar)
- `ADMIN_PASSWORD`: yönetim paneli şifresi, en az 12 karakter
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`
- `SITE_URL`: isteğe bağlı; yoksa Vercel üretim adresi, o da yoksa localhost
- `VIEW_SALT`: isteğe bağlı; okunma sayacındaki IP özetlerinin tuzu

## Mimari

### Veri katmanı: `src/lib/data.ts`

Tüm okuma sorguları burada; `"use cache"` + `cacheTag("series")` ile önbelleklenir.
Yönetim paneli veri değiştirince `updateTag("series")` çağırır (`src/app/admin/actions.ts`).
**Her sayfa yalnızca ihtiyacı kadarını çeker**; tüm serileri bölümleriyle birlikte çeken bir fonksiyon
bilerek yok. Yeni sayfa eklerken bu ilkeyi koru.

| Fonksiyon | Döndürdüğü | Kullanan |
|---|---|---|
| `getSeriesList()` | `SeriesSummary[]`: seri bilgisi, bölüm sayısı, ilk bölüm, son 3 bölüm | ana sayfa, `/ara`, popüler, türler |
| `getSeries(slug)` | `Series`: seri ve tüm bölümlerin listesi (sayfalar hariç) | seri sayfası |
| `getChapter(slug, no)` | bölüm, sayfaları (`Page[]`) ve sonraki bölümün ilk 3 sayfası | okuyucu |
| `getChapterRefs()` | tüm bölümlerin slug/numara/tarihi | sitemap, `generateStaticParams` |
| `getPopular()` | günlük/haftalık/aylık en çok okunanlar ve 14 günlük eğri | yan sütun |

Tipler `src/lib/series.ts` içinde; bu dosya veritabanı içermez, istemci bileşenleri de kullanır.

### Şema: `src/db/schema.ts`

- `series`: `views` toplam okunma
- `chapters`: `pages` (text[], URL'ler, okunma sırasıyla) ve `page_sizes` (jsonb, `[genişlik, yükseklik][]`,
  `pages` ile aynı sırada; eski bölümlerde `[]` olabilir, okuyucu boyutsuz da çalışır)
- `series_views_daily`: seri başına günlük okunma (İstanbul saatine göre gün)
- `view_hits`: tekrar sayımı önlemek için (IP özeti, bölüm, gün). Sadece bugün ve dün tutulur.

### Okunma sayacı: `src/app/api/goruntulenme/route.ts`

Okuyucu bölüm açılınca `{ slug, chapter }` gönderir; tarayıcı aynı bölümü günde bir kez gönderir
(localStorage). Asıl koruma sunucuda: tek bir SQL ifadesi (CTE), bölüm gerçekten varsa ve bu IP özeti
bugün o bölümü saymadıysa `series.views` ve `series_views_daily` sayaçlarını artırır. Başka sitelerden
(`Origin` uyuşmazsa) gelen istekler 403 alır. Eski `view_hits` kayıtları ara sıra `after()` ile silinir.

> neon-http sürücüsü etkileşimli transaction desteklemez. Birden fazla tablonun birlikte değişmesi
> gerekiyorsa tek SQL ifadesi (CTE) kullan.

### Görseller

- Yükleme: panel her sayfayı ayrı istekle `/api/admin/upload`'a gönderir (Vercel ~4,5 MB istek sınırı;
  dosya başına 4 MB). Sunucu `src/lib/images.ts` ile görseli küçültür (sayfa 1200 px, kapak 720 px)
  ve WebP'ye çevirir. 16383 px'ten uzun şeritler JPEG'e düşer. Zaten küçük ve iyi sıkıştırılmış
  dosyalar olduğu gibi kalır. Yanıt `{ url, width, height }` döner, boyutlar `page_sizes`'a yazılır.
- R2 anahtarları: `series/<slug>/cover-<rastgele>.<ext>`, `series/<slug>/<bölüm>/<001>-<rastgele>.<ext>`.
  Dosyalar `immutable` önbellek başlığıyla yüklenir. Silmede önek bazlı silinir (`deletePrefix`).
- Veritabanında görseller **tam URL** olarak saklanır (`publicUrl()` ile `R2_PUBLIC_URL` + anahtar).
  `R2_PUBLIC_URL` değişirse eski kayıtlar SQL `replace` ile güncellenmeli (README → Yayınlama).
- `next/image` bilerek kullanılmıyor: görseller yüklemede optimize ediliyor; ham `<img>` +
  `width`/`height` kullanılıyor.

### Okuyucu: `src/components/Reader.tsx`

Yalnızca dikey (webtoon) okuma; sayfa sayfa modu kaldırıldı.

- Aşağı kaydırınca site başlığı ve okuyucu barı gizlenir, sadece 3 px ilerleme çizgisi kalır;
  yukarı kaydırınca geri gelir. Site başlığı layout'ta olduğu için `<html data-chrome="hidden">` +
  `.site-header` CSS'i (`globals.css`) ile gizlenir.
- Son 3 sayfaya gelince sonraki bölüm `router.prefetch` ile, ilk 3 görseli `preload` ile önceden yüklenir.
- En altta çekmeye devam edilirse (dokunmatik ya da fare tekerleği) 2 saniyelik halka dolar;
  bırakılmazsa sonraki bölüme geçilir (`PullToNext`).
- Okuma geçmişi localStorage'da (`src/lib/progress.ts`, anahtar `mangaoku:progress`). Bölüm açılınca
  kayıtlı sayfaya kaydırılır ve "Başa dön" bildirimi gösterilir. Kayıt bir kez okunur (ref), çünkü
  StrictMode'da efekt iki kez çalışır ve ikinci okuma kaydedilmiş "sayfa 1"i görür.

### Yönetim paneli: `/admin`

Tek şifre (`ADMIN_PASSWORD`); çerezde şifreden türetilen HMAC tutulur (`src/lib/auth.ts`).
Seri ekleme/düzenleme/silme ve bölüm yükleme. İşlemler `src/app/admin/actions.ts` içindeki server action'larda.

## Test etme ipuçları (bulut ortamında)

- Burada gerçek veritabanı ve R2 yok. Yerel test için:
  1. `/usr/lib/postgresql/16/bin` ile root olmayan bir kullanıcıyla (`runuser -u <kullanıcı> --`) Postgres başlat.
  2. `npm i --no-save pg @types/pg`; `src/db/index.ts`'i geçici olarak `drizzle-orm/node-postgres`'e çevir.
  3. `DATABASE_URL=... npx drizzle-kit push` ile şemayı kur, `next dev` ile dene.
  4. **Bitince `git checkout -- src/db/index.ts`**; test sürücüsü asla commit edilmemeli.
- Tarayıcı testi: Playwright, `executablePath: "/opt/pw-browsers/chromium"` (`playwright-core`'u scratchpad'e kur).
- `pkill -f "next dev ..."` aynı komut satırındaki kabuğu da öldürür (desen kendi komutuyla eşleşir).
  Önce `pgrep` ile PID bul, sonra ayrı komutla `kill`.
- `next build` veritabanı ister (`generateStaticParams`); veritabanı yoksa burada çalıştırılamaz.
- Geliştirme logundaki `Route "/seri/[slug]": Next.js encountered URL data during prerendering`
  uyarıları bu değişikliklerden önce de vardı; henüz ele alınmadı.

## Yapılanlar

- Temel site: ana sayfa, seri ve bölüm sayfaları, arama/filtre, koyu tema, hero slider
- Yönetim paneli: giriş, seri ve bölüm yönetimi, R2'ye görsel yükleme
- Popüler: günlük/haftalık/aylık sekmeleri ve 14 günlük okunma grafiği
- Teknik SEO: sitemap, robots, canonical, Open Graph, JSON-LD
- Okuyucu: sadece dikey mod, kaydırınca gizlenen barlar, sonraki bölümü önceden yükleme,
  çekerek sonraki bölüme geçiş, kaldığın sayfaya otomatik kaydırma
- Veri katmanı: her sayfa yalnızca gerekeni çeken hedefli sorgular
- Okunma sayacı: sunucu tarafında IP + bölüm + gün sınırı
- Görseller: yüklemede WebP'ye çevirme ve küçültme, sayfa boyutlarının kaydı

## Sıradakiler (önerilmiş, henüz yapılmadı)

- R2'ye kendi alan adını bağlamak (CDN). Kod değil, Cloudflare ayarı; `R2_PUBLIC_URL` güncellenir.
- Okuyucu: genişlik/parlaklık ayarı, tam ekran düğmesi
- Kullanıcı hesapları (Auth.js / Better Auth): kütüphane/takip listesi, yeni bölüm bildirimi,
  cihazlar arası okuma geçmişi, puanlama
- Topluluk: bölüm yorumları (spoiler gizleme, moderasyon), bölüm sonu tepkileri
- Keşif: tür sayfaları (`/tur/...`), benzer seriler, arama sıralaması, yayın takvimi, RSS
- Panel: zamanlanmış yayın, taslak bölümler, ZIP ile toplu yükleme, bölüm bazlı istatistik
- Altyapı: PWA, hata takibi (Sentry), analitik, Playwright uçtan uca testleri
- Yukarıdaki prerendering uyarıları
