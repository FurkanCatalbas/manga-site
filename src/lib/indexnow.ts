// IndexNow: yeni ya da değişen sayfaları Bing, Yandex ve diğer katılımcı arama motorlarına anında bildirir
// (Google katılmıyor; o site haritasını okur). Anahtar dosyası public/<INDEXNOW_KEY>.txt.
import { after } from "next/server";
import { absoluteUrl, SITE_URL } from "@/lib/site";

export const INDEXNOW_KEY = "de2b44b8a1119edc2d2b9576f1dc44b3";

/** Yanıt beklenmeden, sayfa yanıtı gönderildikten sonra bildirir. Yalnızca canlı sitede çalışır. */
export function notifyIndexNow(paths: string[]) {
  const live = process.env.NODE_ENV === "production" && SITE_URL.startsWith("https://");
  if (!live || paths.length === 0) return;
  after(async () => {
    try {
      const res = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: new URL(SITE_URL).host,
          key: INDEXNOW_KEY,
          keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
          urlList: paths.map(absoluteUrl),
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok && res.status !== 202) console.warn(`IndexNow ${res.status}: ${await res.text()}`);
    } catch (e) {
      console.warn("IndexNow gönderilemedi:", (e as Error).message);
    }
  });
}
