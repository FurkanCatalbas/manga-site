// Marka işaretinden (src/lib/brand.ts) sekme ve uygulama ikonlarını üretir.
// Çalıştırma: npm run icons
//
// Üretilenler:
//   src/app/icon.svg          tarayıcı sekmesi (modern tarayıcılar)
//   src/app/favicon.ico       eski tarayıcılar (16 ve 32 px)
//   src/app/apple-icon.png    iPhone ana ekranı (180 px)
//   public/icons/icon-192.png, icon-512.png   uygulama manifesti (Android, PWA)
//   public/icons/maskable-512.png             Android'in şekle kırptığı ikon (güvenli alanlı)
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { markSvg } from "../src/lib/brand";

const png = (svg: string, size: number) => sharp(Buffer.from(svg), { density: 72 * (size / 64) * 2 }).resize(size, size).png().toBuffer();

/** PNG'leri gömerek .ico dosyası oluşturur (Vista'dan beri desteklenen biçim). */
function ico(images: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // ayrılmış
  header.writeUInt16LE(1, 2); // tür: ikon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4); // renk düzlemi
    e.writeUInt16LE(32, 6); // bit derinliği
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

async function main() {
  const tile = markSvg({ background: "rounded", scale: 0.86 });
  const square = (scale: number) => markSvg({ background: "square", scale });
  await mkdir("public/icons", { recursive: true });

  await writeFile("src/app/icon.svg", tile);
  await writeFile(
    "src/app/favicon.ico",
    ico(await Promise.all([16, 32].map(async (size) => ({ size, data: await png(tile, size) })))),
  );
  await writeFile("src/app/apple-icon.png", await png(square(0.8), 180));
  await writeFile("public/icons/icon-192.png", await png(square(0.8), 192));
  await writeFile("public/icons/icon-512.png", await png(square(0.8), 512));
  // Maskable: Android ikonu daire ya da başka şekle kırpar; işaret ortadaki %60'lık alanda kalmalı
  await writeFile("public/icons/maskable-512.png", await png(square(0.6), 512));

  console.log("İkonlar üretildi.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
