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
- `CONTACT_EMAIL`: yasal sayfalardaki başvuru adresi (varsayılan `iletisim@webtooku.com.tr`)
- Hesaplar: `BETTER_AUTH_SECRET` (yoksa hesap/yorum/tepki kapalı), `GOOGLE_CLIENT_ID/SECRET`, `RESEND_API_KEY`
  + `EMAIL_FROM` (e-postayla kayıt; yoksa yalnızca Google), isteğe bağlı `DISCORD_CLIENT_ID/SECRET`.
  `AUTH_DEV_EMAIL=1` yalnızca yerel test: e-posta kaydı doğrulamasız açılır, e-postalar günlüğe yazılır.

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
| `getSimilarSeries(slug)` | en çok türü paylaşan 6 seri (eşitlikte çok okunan) | seri sayfası "Benzer seriler" |
| `getSeriesSource(slug)` (`src/lib/fansubs.ts`) | serinin çeviri kaynağı ya da `null` | seri sayfası, okuyucu |

Tipler `src/lib/series.ts` içinde; bu dosya veritabanı içermez, istemci bileşenleri de kullanır.

### Şema: `src/db/schema.ts`

- `series`: `views` toplam okunma, `title` Türkçe ad, `title_en` İngilizce ad (boş olabilir). Sitede İngilizce ad
  başlıktır (kartlar, listeler, okuyucu, SEO); Türkçe ad yalnızca seri sayfasında başlığın altında görünür.
  `src/lib/data.ts` → `withNames`: `title` = İngilizce ad ya da Türkçe ad, `titleAlt` = İngilizce ad varsa
  Türkçe ad. Aramada ikisi de eşleşir. Panel ham alanları (`title`, `titleEn`) kullanır. Eski `author` (yazar/çizer) alanı kaldırıldı.
  `exclusive` "Orijinal / Sadece webtooku" rozeti; `featured` ana sayfa afişi; `banner` geniş afiş görseli (R2'de
  `series/<slug>/banner-*` ya da bağlantı; boşsa hero kapağın bulanık halini kullanır). Panel → seri formu →
  Vitrin. Hiç `featured` seri yoksa hero son güncellenen 5 seriyi gösterir (`getFeatured`).
  `alt_titles` (text[]) diğer adları (Korece, romanize…): seri sayfasında "Diğer adları", JSON-LD `alternateName`,
  aramada eşleşir. Panelde her satıra bir ad; kayıtta boşlar, tekrarlar ve Türkçe/İngilizce adın aynısı atılır.
  **Sütun yoksa site bozulmaz:** `hasAltTitles()` (`src/lib/schema-check.ts`, `series` etiketiyle önbellekli)
  sütunu denetler; okuma sorguları onu atlar, panel eklenecek SQL'i gösterir, yeni seri ekleme o SQL'i ister
  (Drizzle insert tüm sütunları yazar). Bu yüzden `db.query.series` sorgularında `columns` belirt; tüm sütunları
  seçen yeni sorgu yazma.
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
  alınmıştır" kutusu (`src/components/SourceNotice.tsx`; yalnızca seri sayfasında bölüm listesinin üstünde;
  bölüm sonundaki satır kullanıcı isteğiyle kaldırıldı). Kaynak seçilmemiş seride kutu yok. Tablolar yoksa site bozulmaz
  (`isMissingTable`), panel → Kaynaklar oluşturma SQL'ini gösterir. Bağlantılar `cleanUrl` ile yalnızca
  http(s); dış bağlantılar `rel="nofollow noopener"`. Logo R2'de `fansubs/<slug>/` altında; slug sonradan değişmez.

### SEO ve paylaşım

- Başlıklarda "Türkçe Oku" (seri: `X Türkçe Oku`, bölüm: `X 12. Bölüm Türkçe Oku`); açıklamalarda diğer adlar.
- Bölüm sayfasında okuyucu çubuğundaki satır `h1`; okuyucunun altında `ChapterAbout` (seri bilgisi, Paylaş,
  son 6 bölüm, kısa metin). Okuyucu `children` ile alır, gezinti düğmelerinin altına koyar.
- Paylaşım görselleri (og:image, 1200×630): `/paylasim/<slug>` ve `/paylasim/<slug>/<no>` (route handler,
  `src/lib/share-image.tsx`). Kapak sunucuda indirilip `sharp` ile JPEG'e çevrilir (satori WebP okuyamaz);
  açılmazsa kapaksız çizilir. Türkçe harfler için Onest latin-ext dosyaları (`assets/fonts`); yazı tipleri
  `next.config.ts` → `outputFileTracingIncludes` ile pakete girer. CDN'de 1 gün önbellek. `/api/` altında
  değil, çünkü robots.txt `/api/`'yi kapatıyor ve paylaşım botları robots'a uyar.
- `ShareButton`: dokunmatikte sistemin paylaşım ekranı, masaüstünde WhatsApp/X/Telegram/kopyala menüsü.
- IndexNow (`src/lib/indexnow.ts`): bölüm eklenince (panel ve `/api/admin/bolum`) ve seri kaydedilince
  Bing/Yandex'e `after()` ile bildirir; yalnızca üretimde ve `SITE_URL` https iken. Anahtar dosyası
  `public/<INDEXNOW_KEY>.txt`. Google katılmıyor, site haritasını okur.
- Doğrulamalar: Bing `public/BingSiteAuth.xml` + layout `verification` (`msvalidate.01`). Google/Yandex
  eklenecekse aynı yere.
- Ölçüm: Vercel Web Analytics (`SiteAnalytics.tsx`, `/admin` sayılmaz); Vercel panelinde açılmalı.
- `SITE_URL` canlıda `https://www.webtooku.com.tr` olmalı (canonical, site haritası, IndexNow buna göre).

### Hesaplar ve topluluk

- **Better Auth** (`src/lib/hesap.ts`, istemci `src/lib/hesap-client.ts`, uç noktalar `/api/auth/*`). Tablolar
  `users`, `sessions`, `accounts`, `verifications` (Postgres'te `user` ayrılmış sözcük olduğu için çoğul; adaptöre
  `schema` eşlemesiyle verilir). neon-http transaction desteklemez; Drizzle adaptörü pg'de transaction kullanmaz.
  `getAuth()` env yoksa null döner, site hesapsız çalışır. Giriş yolları: Google, e-posta+şifre (Resend varsa
  doğrulama zorunlu), Discord (env varsa). Aynı e-postalı Google hesabı mevcut hesaba bağlanır.
- `users.username` sitede görünen ad (gerçek ad gösterilmez): kayıtta addan üretilir (`uniqueUsername`),
  profilden `authClient.updateUser({ username })` ile değişir; kural ve tekillik `databaseHooks.user.update.before`
  içinde (`APIError`). `users.banned`: panelden engel; engelli yorum/beğeni/tepki yapamaz.
- **Oturum tarayıcıda okunur** (`authClient.useSession()`): sayfalar statik kalır. Başlıkta `AccountButton`
  (masaüstü), mobilde alt menüde Profil sekmesi. Sunucuda `getSessionUser()` (yalnızca action/Suspense içinde).
  Oturum çerezi 5 dk önbellekli; bu yüzden engel durumu her işlemde veritabanından okunur (`currentUser`).
- Sayfalar: `/giris`, `/kayit`, `/sifre` (sıfırlama isteği), `/sifre/yeni?token=`, `/profil` (kullanıcı adı,
  fotoğrafı kaldırma, çıkış, hesap silme). Dönüş adresi `?geri=` gönderimde `window.location`'dan okunur
  (`safeNext` yalnızca site içi yol kabul eder); bu sayede formlar önceden çizilen HTML'de var.
- **Yorumlar** (`comments`, `comment_likes`, `comment_reports`): seri sayfasında (chapter_id boş) ve bölüm
  sayfasında. Yanıt tek seviye. Okuma `src/lib/topluluk.ts` (`getComments` ilk sayfa önbellekli, etiket
  `yorum-c<bölümId>` / `yorum-s<seriId>`), yazma `src/lib/topluluk-actions.ts` (server action, `updateTag`).
  İstemciden gelen kimliklere güvenilmez: `{ slug, chapter }` sunucuda `resolveScope` ile kimliğe çevrilir.
  Sınırlar: 2–2000 karakter, en fazla 2 bağlantı, 20 sn'de bir, günde 100. Yanıtı olan yorum silinince
  "Bu yorum silindi" olarak kalır. Bölüm sayfasında ilk 3 başlık görünür (`preview`).
- **Tepkiler** (`chapter_reactions`): bölüm sonunda 5 tepki (`REACTIONS`), kullanıcı başına bölümde bir;
  sayılar önbellekli (`tepki-<bölümId>`).
- Tablolar yoksa yorum/tepki bölümleri görünmez (önbellekte yalnızca birkaç dakika tutulur), panel → Yorumlar
  oluşturma SQL'ini gösterir (`src/lib/topluluk-sql.ts`; şema değişince güncelle).
- Panel → Yorumlar (`/admin/yorumlar`): şikâyet edilenler, son yorumlar, silme, şikâyeti kapatma, engelleme
  (engel oturumları da kapatır).
- Yasal sayfalar: `/gizlilik` (KVKK aydınlatma), `/kullanim-kosullari`, `/topluluk-kurallari` (`LegalPage.tsx`);
  altbilgide bağlantılar. Yeni bir kişisel veri işlenirse gizlilik metnini güncelle.
- Test: `AUTH_DEV_EMAIL=1` + `BETTER_AUTH_SECRET` ile e-posta kaydı doğrulamasız çalışır; Playwright ile
  kayıt → yorum → beğeni → şikâyet → panelde engel akışı denenebilir. Google girişi bulut ortamında denenemez.

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
görsellerini toplar ve `/admin/al#<json>`
adresini açar; veri `#` içinde olduğu için sunucuya gitmez. Görsel seçimi: önce bilinen okuyucu kutuları
(`READER`: okutoon `img.reader-page`, paradoxscans `#chapter-content img`, Madara temaları…). Yoksa genişliği
400+ görsellerden yorum alanındakiler (`COMMENTS`: `[class*=comment]`, avatar, disqus…) atılır ve görsellerin
%70'ini içeren en içteki kutunun dışındakiler (kenar çubuğu, yorum) bırakılır. Yeni bir site yanlış görsel
çekerse okuyucu kutusunu `READER`'a ekle. Yer imi kodu değişince kullanıcı yer imini yeniden sürüklemeli. Yayından önce istenmeyen sayfalar (reklam,
ekip tanıtımı) küçük resimlere dokunarak seçilip "Seçilenleri çıkar" ile listeden atılır; "Hepsini geri getir"
ilk listeye döner (yalnızca tarayıcıda, sayfa yenilenince # verisi yeniden okunur). Panel bağlantıları dener ve `createChapter` ile
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
  5. Scratchpad izinleri sıfırlanınca Postgres kapanabiliyor; veri klasörünü `/var/tmp` altında tutmak daha sağlam.
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
- Panel → Bölüm al: kaynak sitede tek tıkla bölüm gönderen yer imi; yayından önce seçilen sayfaları çıkarma
- Ana sayfa: panelden seçilen büyük afişli hero, yan sütunda Popüler altında "Yeni seriler" (Türler yerine);
  kartlarda "Yeni" (seri 14 gün içinde eklendiyse), alev (son güncellenenlerde, 3 gün içinde bölüm) ve
  "Orijinal" rozetleri (`Badges.tsx`; zamana bağlı olanlar tarayıcıda `Fresh` ile)
- SEO: diğer adlar (`alt_titles`), başlıklarda "Türkçe", bölüm sayfasında seri bilgisi ve son bölümler,
  benzer seriler, kapaklı paylaşım görselleri ve Paylaş düğmesi, IndexNow, Bing doğrulaması, Vercel Analytics
- Topluluk: Google + e-posta ile hesaplar (Better Auth), profil, seri ve bölüm yorumları (yanıt, beğeni,
  spoiler, şikâyet), bölüm sonu tepkileri, panelde yorum moderasyonu ve engelleme, KVKK/kullanım/topluluk sayfaları
- Marka: "oo"su gözlüğe dönüşen yazı logosu (beyaz + mor cam), iki renkli gözlük ikonu,
  favicon/iPhone/Android ikonları, uygulama manifesti, yeni paylaşım görseli

## Sıradakiler (önerilmiş, henüz yapılmadı)

- R2'ye kendi alan adını bağlamak (CDN). Kod değil, Cloudflare ayarı; `R2_PUBLIC_URL` güncellenir.
- Okuyucu: genişlik/parlaklık ayarı, tam ekran düğmesi
- PWA: manifest ve ikonlar hazır; çevrimdışı çalışma (service worker) ve yükleme istemi eksik
- Yükleme iskeletleri (skeleton) ve sayfa geçiş animasyonları
- Hesaplarla: kütüphane/takip listesi ve okuma geçmişinin sunucuya taşınması (cihazlar arası), yeni bölüm
  bildirimi, puanlama
- Topluluk: forum (kategoriler, konular), sitede canlı sohbet (kullanıcı istedi; Pusher/Ably ya da yoklama)
- Keşif: yayın takvimi, RSS, seri tipi (webtoon/manga/manhwa) filtresi
- Panel: zamanlanmış yayın, taslak bölümler, ZIP ile toplu yükleme, bölüm bazlı istatistik
- Altyapı: hata takibi (Sentry), analitik, Playwright uçtan uca testleri
- Yukarıdaki prerendering uyarıları
