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
export const SITE_DESCRIPTION = "Webtoon ve manga serilerini ücretsiz ve hızlı oku. Her hafta yeni bölümler.";

/** Göreli adresi (/seri/x veya /sample/kapak.svg) tam adrese çevirir; tam adresleri olduğu gibi bırakır. */
export function absoluteUrl(path: string) {
  return /^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
