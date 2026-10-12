# webtooku

Türkçe webtoon ve manga okuma sitesi. Next.js 16, Neon Postgres (Drizzle), Cloudflare R2 ve Vercel.

## Özellikler

- Dikey (webtoon) okuyucu: kaydırınca gizlenen barlar, kaldığın sayfadan devam,
  sonraki bölümü önceden yükleme, en altta çekerek sonraki bölüme geçiş
- Ana sayfa, seri sayfaları, arama ve tür/durum filtresi
- Popüler listesi: günlük, haftalık, aylık ve 14 günlük okunma grafiği
- Yönetim paneli (`/admin`): seri ve bölüm ekleme; yüklenen görseller otomatik
  küçültülüp WebP'ye çevrilir
- Teknik SEO: sitemap, robots, canonical, Open Graph, yapısal veri

## Kurulum

```bash
npm install
```

Proje kökünde `.env.local` oluştur:

```bash
DATABASE_URL=postgres://...          # Neon bağlantı adresi
ADMIN_PASSWORD=en-az-12-karakter     # Yönetim paneli şifresi

R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_PUBLIC_URL=https://cdn.ornek.com  # Bucket'ın herkese açık adresi

# İsteğe bağlı
SITE_URL=https://ornek.com           # Yoksa Vercel üretim adresi kullanılır
VIEW_SALT=rastgele-bir-deger         # Okunma sayacındaki IP özetlerinin tuzu
CONTACT_EMAIL=iletisim@ornek.com     # Yasal sayfalardaki başvuru adresi

# Kullanıcı hesapları (BETTER_AUTH_SECRET yoksa hesaplar, yorumlar ve tepkiler kapalı)
BETTER_AUTH_SECRET=...               # openssl rand -base64 32
GOOGLE_CLIENT_ID=...                 # Google ile giriş
GOOGLE_CLIENT_SECRET=...
RESEND_API_KEY=...                   # E-postayla kayıt, doğrulama ve şifre sıfırlama
EMAIL_FROM="webtooku <bildirim@ornek.com>"  # Resend'de doğrulanmış alan adından
DISCORD_CLIENT_ID=...                # İsteğe bağlı: Discord ile giriş
DISCORD_CLIENT_SECRET=...
# AUTH_DEV_EMAIL=1                   # Yalnızca yerel test: e-postalar günlüğe yazılır
```

Veritabanını hazırla ve çalıştır:

```bash
npm run db:push     # Tabloları oluşturur / günceller
npm run db:seed     # İsteğe bağlı: örnek seriler
npm run dev         # http://localhost:3000
```

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` / `npm start` | Üretim derlemesi / sunucusu |
| `npm run lint` | ESLint |
| `npm run db:push` | Şemayı veritabanına uygular |
| `npm run db:seed` | Örnek serileri ekler |
| `npm run db:backfill-sizes` | Eski bölümlerin sayfa boyutlarını kaydeder (sayfa kaymasını önler) |
| `npm run db:studio` | Veritabanını tarayıcıda görüntüler |
| `npm run samples` | Örnek SVG görsellerini üretir |
| `npx tsx scripts/r2-check.ts` | R2 bağlantısını test eder |

## Yayınlama

`main` dalına gönderilen her değişiklik Vercel'de otomatik yayınlanır.

- **Şema değiştiyse** (`src/db/schema.ts`) yayından önce `npm run db:push` çalıştır.
  Yoksa yeni kod, veritabanında olmayan tablo ya da sütunları arar ve hata verir.
- Vercel'de yukarıdaki ortam değişkenlerinin hepsi tanımlı olmalı.
- **CDN:** `R2_PUBLIC_URL` için `r2.dev` adresi yerine bucket'a bağlanmış kendi alan adını kullan
  (Cloudflare panelinde R2 → bucket → Settings → Custom Domains). `r2.dev` adresleri hız
  sınırlıdır ve Cloudflare önbelleğinden geçmez.
  Görsel adresleri veritabanına tam adres olarak yazıldığı için, adres değişince eski kayıtları da güncelle
  (eski ve yeni adresi kendine göre değiştir; sonunda `/` olmasın):

  ```sql
  update series set cover = replace(cover, 'https://pub-xxx.r2.dev', 'https://cdn.ornek.com');
  update chapters set pages = array(
    select replace(p, 'https://pub-xxx.r2.dev', 'https://cdn.ornek.com')
    from unnest(pages) with ordinality as t(p, i) order by i  -- sayfa sırası korunur
  );
  ```

## Proje yapısı

```
src/
  app/                 Sayfalar ve API (seri/, ara/, admin/, api/)
  components/          Okuyucu, kartlar, panel bileşenleri
  db/                  Drizzle şeması ve bağlantı
  lib/                 Veri katmanı (data.ts), görsel işleme, R2, oturum
scripts/               Seed, örnek görseller, bakım betikleri
```

Ayrıntılı mimari notları ve kurallar için: [CLAUDE.md](CLAUDE.md)
