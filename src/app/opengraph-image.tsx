import { ImageResponse } from "next/og";

// Site paylaşılınca (WhatsApp, Discord, X…) görünen varsayılan önizleme kartı.
// Seri sayfaları kendi kapaklarını kullanır.
export const alt = "webtooku: webtoon ve manga oku";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          background: "linear-gradient(135deg, #101118 0%, #21242f 100%)",
          color: "#e9eaf0",
        }}
      >
        <div style={{ display: "flex", fontSize: 128, fontWeight: 800, letterSpacing: -4 }}>
          webtoo<span style={{ color: "#ff4f8b" }}>ku</span>
        </div>
        <div style={{ marginTop: 24, fontSize: 44, color: "#9296a8" }}>Webtoon ve manga oku</div>
        <div style={{ marginTop: 56, width: 160, height: 10, borderRadius: 5, background: "#ff4f8b" }} />
      </div>
    ),
    size,
  );
}
