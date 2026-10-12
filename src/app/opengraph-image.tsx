import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND_COLORS, bridgeSvg, markSvg, O_ADVANCE, O_GAP } from "@/lib/brand";

// Site paylaşılınca (WhatsApp, Discord, X…) görünen varsayılan önizleme kartı.
// Seri sayfaları kendi kapaklarını kullanır.
export const alt = "webtooku: webtoon ve manga oku";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONT = 120;

// Sitedeki yazı tipleri (OFL lisanslı, assets/fonts)
const [dela, onest] = await Promise.all([
  readFile(join(process.cwd(), "assets/fonts/dela-gothic-one-latin-400-normal.woff")),
  readFile(join(process.cwd(), "assets/fonts/onest-latin-400-normal.woff")),
]);

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: `radial-gradient(circle at 20% 0%, rgba(139,92,246,0.28), transparent 60%), ${BRAND_COLORS.bg}`,
          color: "#eef0f6",
          fontFamily: "Onest",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <img
            alt=""
            width={150}
            height={150}
            src={`data:image/svg+xml;base64,${Buffer.from(markSvg()).toString("base64")}`}
          />
          <div style={{ display: "flex", fontFamily: "Dela Gothic One", fontSize: FONT, letterSpacing: -0.025 * FONT, lineHeight: 1 }}>
            <span>webt</span>
            {/* "oo": beyaz ve mor cam, aralarında köprü (bkz. src/lib/brand.ts) */}
            <div style={{ display: "flex", position: "relative" }}>
              <span style={{ marginRight: O_GAP * FONT }}>o</span>
              <span style={{ color: BRAND_COLORS.accent2 }}>o</span>
              <img
                alt=""
                width={(2 * O_ADVANCE + O_GAP) * FONT}
                height={FONT}
                style={{ position: "absolute", left: 0, top: 0 }}
                src={`data:image/svg+xml;base64,${Buffer.from(bridgeSvg()).toString("base64")}`}
              />
            </div>
            <span
              style={{
                backgroundImage: `linear-gradient(90deg, ${BRAND_COLORS.accent2}, ${BRAND_COLORS.accent})`,
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              ku
            </span>
          </div>
        </div>
        <div style={{ marginTop: 24, fontSize: 44, color: "#9095a9" }}>Webtoon ve manga oku</div>
        <div style={{ marginTop: 56, width: 160, height: 10, borderRadius: 5, background: `linear-gradient(90deg, ${BRAND_COLORS.fg}, ${BRAND_COLORS.accent2})` }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Dela Gothic One", data: dela, weight: 400, style: "normal" },
        { name: "Onest", data: onest, weight: 400, style: "normal" },
      ],
    },
  );
}
