// Sitenin herkese açık adresi. Öncelik sırası:
// 1. SITE_URL ortam değişkeni (ör. https://webtooku.com.tr)
// 2. Vercel'in üretim adresi (alan adı bağlanınca otomatik olarak o olur)
// 3. Yerel geliştirme
export const SITE_URL = (
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "webtooku";

/**
 * Henüz hiç seri/bölüm yokken generateStaticParams'ın döndürdüğü yer tutucu. Slug kalıbına
 * (küçük harf, rakam, tire) uymadığı için gerçek bir seriyle çakışamaz; sayfası 404 verir.
 */
export const PLACEHOLDER_SLUG = "_yok";
export const SITE_DESCRIPTION =
  "Türkçe webtoon, manga ve manhwa serilerini reklamsız, üyeliksiz ve tamamen ücretsiz oku. Her hafta yeni bölümler.";

/** Sitenin vaadi: başlık ve açıklamalarda kullanılır (reklam yok, üyelik gerekmez, ücretsiz). */
export const SITE_PROMISE = "reklamsız, üyeliksiz, ücretsiz";

/**
 * Meta anahtar kelimeleri. Google bu etiketi sıralamada kullanmaz; zararı yok, bazı arama motorları okur.
 * Asıl etki başlık, açıklama ve sayfa metninden gelir.
 */
export const SITE_KEYWORDS = [
  "webtoon oku",
  "türkçe webtoon",
  "manga oku",
  "türkçe manga",
  "manhwa oku",
  "türkçe manhwa",
  "reklamsız webtoon",
  "ücretsiz manga oku",
  "üyeliksiz webtoon oku",
];

/** Göreli adresi (/seri/x veya /sample/kapak.svg) tam adrese çevirir; tam adresleri olduğu gibi bırakır. */
export function absoluteUrl(path: string) {
  return /^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Hukuki başvurular, telif bildirimleri ve KVKK talepleri için adres (yasal sayfalarda görünür). */
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? "iletisim@webtooku.com.tr";
