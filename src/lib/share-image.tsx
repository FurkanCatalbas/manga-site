// Seri ve bölüm paylaşım görseli (1200×630): solda kapak, sağda seri adı ve bölüm numarası.
// WhatsApp, X, Discord gibi yerlerde bağlantı önizlemesi olarak görünür (bkz. src/app/paylasim).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { BRAND_COLORS, markSvg } from "@/lib/brand";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";

export const SHARE_SIZE = { width: 1200, height: 630 };
const COVER = { width: 380, height: 506 };

// Türkçe harfler (ğ, ş, ı, İ) latin-ext dosyalarında; satori her harf için listedeki ilk uygun yazı tipini kullanır
const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));
const fonts = Promise.all([
  font("onest-latin-700-normal.woff"),
  font("onest-latin-ext-700-normal.woff"),
  font("onest-latin-400-normal.woff"),
  font("onest-latin-ext-400-normal.woff"),
  font("dela-gothic-one-latin-400-normal.woff"),
]).then(([b, bExt, r, rExt, dela]) => [
  { name: "Onest", data: b, weight: 700 as const, style: "normal" as const },
  { name: "Onest", data: bExt, weight: 700 as const, style: "normal" as const },
  { name: "Onest", data: r, weight: 400 as const, style: "normal" as const },
  { name: "Onest", data: rExt, weight: 400 as const, style: "normal" as const },
  { name: "Dela Gothic One", data: dela, weight: 400 as const, style: "normal" as const },
]);

/** Kapağı indirip küçültür; satori WebP okuyamadığı için JPEG'e çevirir. Açılamazsa null (kapaksız çizilir). */
async function coverDataUrl(src: string) {
  try {
    const res = await fetch(absoluteUrl(src), { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const jpg = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(COVER.width, COVER.height, { fit: "cover" })
      .jpeg({ quality: 85 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function shareImage({ title, cover, chapter }: { title: string; cover: string; chapter?: number }) {
  const [coverUrl, fontList] = await Promise.all([coverDataUrl(cover), fonts]);
  const titleSize = title.length > 40 ? 52 : title.length > 22 ? 64 : 76;
  const host = new URL(SITE_URL).host.replace(/^www\./, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "0 72px",
          background: `radial-gradient(circle at 85% 10%, rgba(139,92,246,0.35), transparent 55%), radial-gradient(circle at 10% 100%, rgba(255,79,139,0.22), transparent 50%), ${BRAND_COLORS.bg}`,
          color: BRAND_COLORS.fg,
          fontFamily: "Onest",
        }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            src={coverUrl}
            width={COVER.width}
            height={COVER.height}
            style={{ borderRadius: 28, boxShadow: "0 30px 60px rgba(0,0,0,0.6)", border: "2px solid rgba(255,255,255,0.12)" }}
          />
        ) : (
          <div
            style={{
              width: COVER.width,
              height: COVER.height,
              borderRadius: 28,
              background: `linear-gradient(135deg, ${BRAND_COLORS.accent}, ${BRAND_COLORS.accent2})`,
            }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" width={44} height={44} src={`data:image/svg+xml;base64,${Buffer.from(markSvg()).toString("base64")}`} />
            <span style={{ fontFamily: "Dela Gothic One", fontSize: 34, letterSpacing: -0.8 }}>{SITE_NAME}</span>
          </div>
          <div
            style={{
              marginTop: 36,
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -1.5,
              display: "block",
              lineClamp: 3,
            }}
          >
            {title}
          </div>
          {chapter !== undefined && (
            <div style={{ display: "flex", marginTop: 32 }}>
              <span
                style={{
                  padding: "12px 28px",
                  borderRadius: 999,
                  fontSize: 40,
                  fontWeight: 700,
                  color: "white",
                  background: `linear-gradient(135deg, ${BRAND_COLORS.accent}, ${BRAND_COLORS.accent2})`,
                }}
              >
                {`${chapter}. bölüm`}
              </span>
            </div>
          )}
          <div style={{ marginTop: 36, fontSize: 30, color: "#9095a9" }}>{`Türkçe oku · ${host}`}</div>
        </div>
      </div>
    ),
    {
      ...SHARE_SIZE,
      fonts: fontList,
      // Paylaşım önizlemeleri sık istenir; CDN'de bir gün tutulur
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
    },
  );
}
