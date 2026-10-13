// Tek bir görseli R2'ye yükler. Panel her sayfayı ayrı istekle gönderir;
// böylece Vercel'in istek başına ~4,5 MB sınırına takılmayız.
// Görseller yüklenmeden önce küçültülüp WebP'ye çevrilir (bkz. lib/images); okuyucu için boyutları döndürülür.
import { randomBytes } from "node:crypto";
import { isAdmin } from "@/lib/auth";
import { MAX_WIDTH, optimizeImage } from "@/lib/images";
import { publicUrl, putObject } from "@/lib/r2";
import { SLUG_PATTERN } from "@/lib/slug";

const MAX_BYTES = 4 * 1024 * 1024;

// Tarayıcının bildirdiği türe güvenmeyip dosyanın ilk baytlarına bakarız.
// (Windows'ta .webp dosyaları çoğu zaman türü boş olarak gelir.)
function sniffImage(b: Uint8Array): { ext: string; type: string } | undefined {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { ext: "webp", type: "image/webp" };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (b[0] === 0x89 && ascii(1, 4) === "PNG") return { ext: "png", type: "image/png" };
  if (ascii(0, 4) === "GIF8") return { ext: "gif", type: "image/gif" };
  if (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))) return { ext: "avif", type: "image/avif" };
}

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  if (!(await isAdmin())) return fail(401, "Oturum süresi doldu, tekrar giriş yap.");

  const form = await request.formData();
  const file = form.get("file");
  const slug = String(form.get("slug") ?? "");
  const kind = String(form.get("kind") ?? "");

  if (!(file instanceof File)) return fail(400, "Dosya bulunamadı.");
  if (!SLUG_PATTERN.test(slug)) return fail(400, "Geçersiz seri adresi.");
  if (file.size > MAX_BYTES) return fail(400, `${file.name}: 4 MB'tan büyük.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImage(bytes);
  if (!sniffed) return fail(400, `${file.name}: desteklenmeyen dosya türü (WebP, JPG, PNG, AVIF, GIF).`);
  if (kind !== "cover" && kind !== "banner" && kind !== "page" && kind !== "fansub") return fail(400, "Geçersiz yükleme türü.");

  let image: Awaited<ReturnType<typeof optimizeImage>>;
  try {
    image = await optimizeImage(bytes, sniffed, MAX_WIDTH[kind]);
  } catch {
    return fail(400, `${file.name}: görsel okunamadı, dosya bozuk olabilir.`);
  }
  const { ext } = image;

  const rand = randomBytes(4).toString("hex");
  let key: string;
  if (kind === "cover") {
    key = `series/${slug}/cover-${rand}.${ext}`;
  } else if (kind === "banner") {
    key = `series/${slug}/banner-${rand}.${ext}`;
  } else if (kind === "fansub") {
    // Burada slug, çeviri ekibinin adresi
    key = `fansubs/${slug}/logo-${rand}.${ext}`;
  } else {
    const chapter = Number(form.get("chapter"));
    const index = Number(form.get("index"));
    if (!Number.isInteger(chapter) || chapter < 0 || !Number.isInteger(index) || index < 1) {
      return fail(400, "Geçersiz bölüm veya sayfa numarası.");
    }
    key = `series/${slug}/${chapter}/${String(index).padStart(3, "0")}-${rand}.${ext}`;
  }

  // Adres yüklemeden önce hesaplanır: ayar hatalıysa R2'ye boşuna dosya yüklenmez, panel nedenini gösterir
  let url: string;
  try {
    url = publicUrl(key);
  } catch (e) {
    return fail(500, (e as Error).message);
  }
  await putObject(key, image.bytes, image.type);
  return Response.json({ url, width: image.width, height: image.height });
}
