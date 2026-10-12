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

## Ürün hedefleri

- **Mobil öncelikli.** Tasarım önce telefonda düşünülür, sonra genişletilir. İleride mobil uygulama
  (PWA ya da yerel uygulama) yapılabilir; bu yüzden ekranlar uygulama gibi kurgulanır: alt sekme
  çubuğu, güvenli alan boşlukları (`env(safe-area-inset-*)`), dokunmatik hareketler.
- **Topluluk büyüyecek.** Yorumlar, tepkiler, profiller gelecek. Alt menüde Topluluk ve Profil
  sekmeleri için yer var (`src/components/SiteNav.tsx`).
- **Premium his.** Sade, katmanlı, cilalı; ucuz görünen süslerden kaçın.

## Tasarım dili

- Renkler `globals.css`'te: koyu katmanlı yüzeyler (`bg`, `surface`, `surface-2`), vurgu
  pembe (`accent`) → mor (`accent-2`) gradyanı, yeni içerik için `fresh`.
- Ortak sınıflar (`globals.css` → `@layer components`): `btn-primary` (gradyan ana eylem),
  `btn-ghost` (buzlu cam ikincil), `panel` (kart yüzeyi), `glass` (başlık ve alt menü), `text-gradient`.
  Yeni düğme ve kutularda bunları kullan, yeni stil icat etme.
- İnce kenarlar `ring-white/[0.06–0.15]` ya da `border-white/[0.06–0.08]`, köşeler `rounded-xl`/`2xl`,
  başlıklar `font-display` (Dela Gothic One) ya da `font-bold tracking-tight`.
- **Marka:** yazı logosu `webt` + **beyaz "o"** + **mor "o"** + `ku` (mordan pembeye). Ortadaki "oo"
  bir köprüyle gözlüğe dönüşür: sol cam `webto`'nun, sağ cam `oku`'nun "o"su ("webtoon oku").
  Gözlük ikonu da aynı renklerde (sol beyaz, sağ mor). Tek kaynak `src/lib/brand.ts`: ikon çizimi
  (`MARK_VARIANT`), renkler, köprü geometrisi (Dela Gothic "o" ölçülerine göre em cinsinden).
  Site logosu `src/components/Brand.tsx` (başlıkta sadece yazı; gözlük zaten yazının içinde).
  Sekme/telefon ikonları ve manifest ikonları `npm run icons` ile üretilir (`src/app/icon.svg`,
  `favicon.ico`, `apple-icon.png`, `public/icons/*`). Paylaşım görseli `src/app/opengraph-image.tsx`,
  yazı tipleri `assets/fonts` (OFL).
- İkonlar `src/components/icons.tsx` (satır içi SVG, kütüphane yok).
- Mobilde yatay kayan raflar için `no-scrollbar -mx-4 px-4 overflow-x-auto snap-x`.
- **Yatay taşma:** `html, body { overflow-x: clip }` güvenlik önlemi var (`hidden` değil, sticky'yi bozar),
  ama kök nedeni de düzelt. İçinde `truncate`/`whitespace-nowrap` olan mobil grid'lerde sütunu
  `grid-cols-1` ile ver (yoksa sütun en uzun metne göre genişler), flex çocuklarına `min-w-0`.
  Sığmayabilecek çip/düğme satırları yatay kayan raf olsun. 320 px genişlikte de kontrol et.
- Popüler listesinde grafik/çizgi istenmiyor (kullanıcı kaldırttı).

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
| `npm run icons` | Marka işaretinden sekme, iPhone ve uygulama ikonlarını üretir |
| `npm run samples` | `public/sample` altındaki örnek SVG'leri üretir |
| `npm run db:backfill-sizes` | Sayfa boyutu kayıtlı olmayan eski bölümlerin boyutlarını okuyup kaydeder |
| `npm run db:studio` | Drizzle Studio |
| `npx tsx scripts/r2-check.ts` | R2 bağlantısını dener |

## Ortam değişkenleri (`.env.local`)

- `DATABASE_URL`: Neon bağlantısı (zorunlu; yoksa `src/db/index.ts` hata atar)
- `ADMIN_PASSWORD`: yönetim paneli şifresi, en az 12 karakter
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`
  - R2 için kendi alan adı: `https://cdn.webtooku.com.tr` (`R2_PUBLIC_URL` bu olmalı; eski `r2.dev` adresinden geçiş yapıldı)
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
| `getSeriesList()` | `SeriesSummary[]`: seri bilgisi, eklenme tarihi, bölüm sayısı, ilk bölüm, son 3 bölüm | ana sayfa, `/ara`, `/tur`, popüler |
| `getSeries(slug)` | `Series`: seri ve tüm bölümlerin listesi (sayfalar hariç) | seri sayfası |
| `getChapter(slug, no)` | bölüm, sayfaları (`Page[]`) ve sonraki bölümün ilk 3 sayfası | okuyucu |
| `getChapterRefs()` | tüm bölümlerin slug/numara/tarihi | sitemap, `generateStaticParams` |
| `getPeriodViews()` | her serinin bugün/7 gün/30 gün/toplam okunması | `/ara` ve `/tur/...` popülerlik sıralaması |
| `getPopular()` | günlük/haftalık/aylık/tüm zamanların en çok okunanları | yan sütun |
| `getGenres()` | serilerde geçen türler (ad, slug, seri sayısı); aynı slug'a düşen yazımlar birleşir | başlıktaki Türler menüsü, altbilgi, `/tur` |
| `getSeriesSource(slug)` (`src/lib/fansubs.ts`) | serinin çeviri kaynağı ya da `null` | seri sayfası, okuyucu |

Tipler `src/lib/series.ts` içinde; bu dosya veritabanı içermez, istemci bileşenleri de kullanır.

### Şema: `src/db/schema.ts`

- `series`: `views` toplam okunma, `title` Türkçe ad, `title_en` İngilizce ad (boş olabilir). Sitede İngilizce ad
  başlıktır (kartlar, listeler, okuyucu, SEO); Türkçe ad yalnızca seri sayfasında başlığın altında görünür.
  `src/lib/data.ts` → `withNames`: `title` = İngilizce ad ya da Türkçe ad, `titleAlt` = İngilizce ad varsa
  Türkçe ad. Aramada ikisi de eşleşir. Panel ham alanları (`title`, `titleEn`) kullanır. Eski `author` (yazar/çizer) alanı kaldırıldı.
- `chapters`: `pages` (text[], URL'ler, okunma sırasıyla) ve `page_sizes` (jsonb, `[genişlik, yükseklik][]`,
  `pages` ile aynı sırada; eski bölümlerde `[]` olabilir, okuyucu boyutsuz da çalışır)
- `series_views_daily`: seri başına günlük okunma (İstanbul saatine göre gün)
- `view_hits`: tekrar sayımı önlemek için (IP özeti, bölüm, gün). Sadece bugün ve dün tutulur.
- `genres`: türlerin resmi listesi (ad, slug), panel → Türler'den yönetilir. Seriler tür **adlarını**
  `series.genres` dizisinde tutar. Ad değişikliği/silme tek SQL ifadesiyle serilere de yansır
  (`renameGenre`, `deleteGenre`). Sitenin genel tarafı türleri serilerden türetir, bu tabloya bağlı
  değildir; tablo yoksa panel çalıştırılacak SQL'i gösterir (`isMissingTable`, `src/lib/genres.ts`).
  Tür adları `cleanGenreName` ile düzenlenir (boşluklar, Türkçe ilk harf büyük).
- `fansubs` (ad, slug, site adresi, logo) ve `series_fansubs` (seri başına en fazla bir kaynak +
  serinin kaynak sitedeki adresi): başka ekipten alınan çeviriler için "Bu çeviri X (x.com) üzerinden
  alınmıştır" kutusu (`src/components/SourceNotice.tsx`; seri sayfasında bölüm listesinin üstünde,
  okuyucuda bölüm sonunda tek satır). Kaynak seçilmemiş seride kutu yok. Tablolar yoksa site bozulmaz
  (`isMissingTable`), panel → Kaynaklar oluşturma SQL'ini gösterir. Bağlantılar `cleanUrl` ile yalnızca
  http(s); dış bağlantılar `rel="nofollow noopener"`. Logo R2'de `fansubs/<slug>/` altında; slug sonradan değişmez.

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
- **Bağlantıyla görsel:** panelde kapak için "görsel bağlantısı" alanı, bölümde "Bağlantı yapıştır" sekmesi var.
  Başka sitedeki https görsel adresleri R2'ye inmeden olduğu gibi `cover`/`pages`'e yazılır. Panel her
  bağlantıyı tarayıcıda açıp ölçer (`measureImage`, `upload.ts`): açılmayan sayfa varsa yayınlamaz, boyutlar
  `page_sizes`'a yazılır. Kaynak siteler hotlink'i çoğunlukla `Referer`'a bakarak engellediği için kapak ve
  sayfa `<img>`'lerinde (ve okuyucudaki `preload`'da) `referrerPolicy="no-referrer"` var; yeni görsel
  eklerken bunu koru. Sunucu yalnızca https ya da `/` ile başlayan yolları kabul eder (`isImageSrc`).
- `next/image` bilerek kullanılmıyor: görseller yüklemede optimize ediliyor; ham `<img>` +
  `width`/`height` kullanılıyor.

### Okuyucu: `src/components/Reader.tsx`

Yalnızca dikey (webtoon) okuma; sayfa sayfa modu kaldırıldı.

- Klavye: → sonraki, ← önceki bölüm (yazı alanı/seçicideyken ve değiştirici tuşla çalışmaz).

- Aşağı kaydırınca site başlığı ve okuyucu barı gizlenir, sadece 3 px ilerleme çizgisi kalır;
  yukarı kaydırınca geri gelir. Site başlığı layout'ta olduğu için `<html data-chrome="hidden">` +
  `.site-header` CSS'i (`globals.css`) ile gizlenir.
- Son 3 sayfaya gelince sonraki bölüm `router.prefetch` ile, ilk 3 görseli `preload` ile önceden yüklenir.
- En altta çekmeye devam edilirse (dokunmatik ya da fare tekerleği) 2 saniyelik halka dolar;
  bırakılmazsa sonraki bölüme geçilir (`PullToNext`).
- Okuma geçmişi localStorage'da (`src/lib/progress.ts`, anahtar `mangaoku:progress`). Bölüm açılınca
  kayıtlı sayfaya kaydırılır ve "Başa dön" bildirimi gösterilir. Kayıt bir kez okunur (ref), çünkü
  StrictMode'da efekt iki kez çalışır ve ikinci okuma kaydedilmiş "sayfa 1"i görür.

### Site iskeleti ve okuma geçmişi

- `layout.tsx`: cam başlık (masaüstünde bağlantılar + `GenreMenu` açılır tür menüsü + arama, mobilde
  arama ikonu), türleri ve Keşfet bağlantılarını listeleyen altbilgi ve `MobileTabBar` (Ana sayfa,
  Keşfet, Kütüphane; okuyucuda ve panelde gizli; `/tur` sayfalarında Keşfet etkin görünür).
- Seri listeleri `SeriesBrowser.tsx`: arama (Türkçe + İngilizce ad), tür/durum çipleri, sıralama, sayfa başına 24 seri.
  Süzme tarayıcıda yapılır. `/ara`'da seçimler adrese yazılır (`q`, `tur`, `durum=devam|tamam`,
  `sira=guncel|yeni|populer|az`, `donem=gunluk|haftalik|aylik|tum`, `sayfa`) ve `SeriesBrowserFromUrl`
  ile geri okunur; Suspense yedeği varsayılan liste olduğu için statik HTML'de de seriler var.
  `/tur/<slug>` aynı bileşeni türe göre süzülmüş seriyle ve adres okumadan kullanır (tamamen statik).
  Tür adresi `genreHref(ad)` = `/tur/` + `slugify(ad)`.
- Okuma geçmişi localStorage'da; bileşenler `useAllProgress()` (`src/lib/progress.ts`) ile okur.
  Kullananlar: ana sayfadaki "Okumaya devam et" rafı ve `/kutuphane` (`Library.tsx`), seri sayfasındaki
  "Devam et" düğmesi ve okundu işaretli bölüm listesi (`SeriesActions.tsx`). Hesap sistemi gelince
  bu veri sunucuya taşınmalı.
- "use client" dosyalarından dışa aktarılan fonksiyonlar sunucuda çağrılamaz; ortak yardımcılar
  `src/lib/series.ts` gibi istemci işareti olmayan dosyalarda durur (ör. `toLibraryItems`).

### Yer imiyle bölüm alma: `/admin/al`

Panel → "Bölüm al" sayfasındaki yer imi (bookmarklet, `ChapterImport.tsx`) kaynak sitede açılan bölümün
görsellerini toplar (okutoon: `img.reader-page`, diğerleri: genişliği 400+ görseller) ve `/admin/al#<json>`
adresini açar; veri `#` içinde olduğu için sunucuya gitmez. Panel bağlantıları dener ve `createChapter` ile
yayınlar. Yer imi şifre taşımaz; yayın panel oturumuyla. Kaynak seri → webtooku seri eşlemesi
localStorage'da (`webtooku:kaynak-seri`). React `javascript:` href'ini engellediği için adres ref ile yazılır.

### Dışarıdan bölüm yayınlama: `/api/admin/bolum`

`Authorization: Bearer <ADMIN_PASSWORD>` (ya da panel oturumu) ister. `GET ?seri=<slug>` serideki bölüm
numaralarını, `POST { slug, number, title, pages, pageSizes }` bölümü ekler (409: zaten var). Panel ile aynı
doğrulamayı kullanır (`insertChapter`, `src/lib/chapters.ts`). Route handler'da `updateTag` olmadığı için
`revalidateTag("series", { expire: 0 })`. Kullanan: depo dışındaki `../yayinci/yayinla.py` (okutoon gibi
sitelerden bölüm görsellerinin bağlantılarını çıkarıp yayınlar; Cloudflare kontrolünü aşmaz, kaydedilmiş HTML okur).

### Yönetim paneli: `/admin`

Tek şifre (`ADMIN_PASSWORD`); çerezde şifreden türetilen HMAC tutulur (`src/lib/auth.ts`).
Bölümler: Seriler (ekleme/düzenleme/silme, bölüm yükleme), Türler (`/admin/turler`: ekle, adını
değiştir, sil, serilerde olup listede olmayanları aktar) ve Kaynaklar (`/admin/kaynaklar`: çeviri ekipleri,
logo yükleme; seri formunda "Çeviri kaynağı" seçilir). Yeni seride adres (slug) İngilizce addan, o boşsa Türkçe addan üretilir; sonradan değişmez. Seri formunda türler çiplerle seçilir; formda
yazılan yeni tür kayıtta listeye eklenir. İşlemler `src/app/admin/actions.ts` içindeki server action'larda;
sayfanın yeniden çizilmesi gerekiyorsa `refresh()` (next/cache) çağrılır. `"use server"` dosyası
yalnızca async fonksiyon dışa aktarabilir.

## Test etme ipuçları (bulut ortamında)

- Burada gerçek veritabanı ve R2 yok. Yerel test için:
  1. `/usr/lib/postgresql/16/bin` ile root olmayan bir kullanıcıyla (`runuser -u <kullanıcı> --`) Postgres başlat.
  2. `npm i --no-save pg @types/pg`; `src/db/index.ts`'i geçici olarak `drizzle-orm/node-postgres`'e çevir.
  3. `DATABASE_URL=... npx drizzle-kit push` ile şemayı kur, `next dev` ile dene.
  4. **Bitince `git checkout -- src/db/index.ts`**; test sürücüsü asla commit edilmemeli.
- Tarayıcı testi: Playwright, `executablePath: "/opt/pw-browsers/chromium"` (`playwright-core`'u scratchpad'e kur).
- `pkill -f "next dev ..."` aynı komut satırındaki kabuğu da öldürür (desen kendi komutuyla eşleşir).
  Önce `pgrep` ile PID bul, sonra ayrı komutla `kill`.
- `next build` veritabanı ister (`generateStaticParams`). Yukarıdaki yerel Postgres düzeneğiyle
  `ADMIN_PASSWORD=... npx next build` çalıştırılabilir; **arayüzde önemli değişiklikten sonra mutlaka
  build al**, çünkü `cacheComponents` hatalarını `tsc`, lint ve `next dev` yakalamaz.
- `cacheComponents`'ta `generateStaticParams` boş dizi döndüremez (build kırılır). Liste boşsa
  `PLACEHOLDER_SLUG` (`src/lib/site.ts`) ile yer tutucu döndürülür, sayfası 404 verir. Boş veritabanıyla
  build'i de dene (`createdb` + `drizzle-kit push`).
- `cacheComponents` kuralı: `usePathname`, `useSearchParams`, `cookies()`, `params` gibi istek/adres
  verisi okuyan her şey `<Suspense>` içinde olmalı. Root layout'taki menüler bu yüzden Suspense içinde,
  `pathname={null}` yedeğiyle (`SiteNav.tsx`).
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
- Tasarım yenilemesi: katmanlı koyu tema, gradyan düğmeler, mobil alt sekme çubuğu,
  sinematik ve kaydırılabilir hero, "Okumaya devam et" rafı, Kütüphane sayfası (`/kutuphane`),
  seri sayfasında "Devam et" ve okundu işaretli sıralanabilir bölüm listesi, çipli Keşfet filtreleri;
  popüler listesinden grafikler kaldırıldı
- Panel: tür yönetimi (Türler sayfası, formda çipli tür seçimi)
- Çeviri kaynağı kutusu: panel → Kaynaklar, seri formunda isteğe bağlı kaynak seçimi
- Keşif: tür sayfaları (`/tur`, `/tur/<slug>`), başlıkta Türler menüsü, türlü altbilgi; Keşfet'te sıralama
  (son güncellenen, yeni eklenen, popüler + dönem, A-Z), sayfalama;
  Popüler'de "Tümü" sekmesi
- Seriler: yazar/çizer alanı kaldırıldı, yerine Türkçe + İngilizce ad (`title_en`)
- Panel: R2'ye yüklemeden, başka sitedeki görsel bağlantılarıyla kapak ve bölüm ekleme
- Bölüm yayınlama API'si (`/api/admin/bolum`) ve Python yayıncı scripti için ortak `insertChapter`
- Panel → Bölüm al: kaynak sitede tek tıkla bölüm gönderen yer imi
- Marka: "oo"su gözlüğe dönüşen yazı logosu (beyaz + mor cam), iki renkli gözlük ikonu,
  favicon/iPhone/Android ikonları, uygulama manifesti, yeni paylaşım görseli

## Sıradakiler (önerilmiş, henüz yapılmadı)

- R2'ye kendi alan adını bağlamak (CDN). Kod değil, Cloudflare ayarı; `R2_PUBLIC_URL` güncellenir.
- Okuyucu: genişlik/parlaklık ayarı, tam ekran düğmesi
- PWA: manifest ve ikonlar hazır; çevrimdışı çalışma (service worker) ve yükleme istemi eksik
- Yükleme iskeletleri (skeleton) ve sayfa geçiş animasyonları
- Kullanıcı hesapları (Auth.js / Better Auth): kütüphane/takip listesi, yeni bölüm bildirimi,
  cihazlar arası okuma geçmişi, puanlama
- Topluluk: bölüm yorumları (spoiler gizleme, moderasyon), bölüm sonu tepkileri
- Keşif: benzer seriler, yayın takvimi, RSS, seri tipi (webtoon/manga/manhwa) filtresi
- Panel: zamanlanmış yayın, taslak bölümler, ZIP ile toplu yükleme, bölüm bazlı istatistik
- Altyapı: hata takibi (Sentry), analitik, Playwright uçtan uca testleri
- Yukarıdaki prerendering uyarıları
