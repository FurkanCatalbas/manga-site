// Yüklenen görselleri sunucuda küçültüp WebP'ye çevirir.
import sharp, { type OutputInfo } from "sharp";

// Telefonlarda 3x ekranda bile net görünecek, gereğinden büyük olmayan genişlikler
export const MAX_WIDTH = { page: 1200, cover: 720 } as const;

/**
 * Görseli en fazla `maxWidth` genişliğe küçültür ve WebP'ye çevirir.
 * Çok uzun webtoon şeritleri WebP sınırını (16383 px) aşarsa JPEG'e düşer.
 * Sonuç orijinalden büyük çıkarsa ve küçültme gerekmiyorsa orijinal korunur.
 */
export async function optimizeImage(input: Uint8Array, original: { ext: string; type: string }, maxWidth: number) {
  const base = () =>
    sharp(input) // hareketli GIF'lerin yalnızca ilk karesi alınır
      .rotate() // EXIF yönünü uygula
      .resize({ width: maxWidth, withoutEnlargement: true });

  let out: { data: Buffer; info: OutputInfo };
  let format = { ext: "webp", type: "image/webp" };
  try {
    out = await base().webp({ quality: 80, effort: 4 }).toBuffer({ resolveWithObject: true });
  } catch {
    out = await base().jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true });
    format = { ext: "jpg", type: "image/jpeg" };
  }
  const { width, height } = out.info;

  const meta = await sharp(input).metadata();
  const resized = (meta.autoOrient?.width ?? meta.width) > maxWidth;
  if (!resized && out.data.byteLength >= input.byteLength) {
    return { bytes: input, ...original, width, height };
  }
  return { bytes: new Uint8Array(out.data), ...format, width, height };
}
