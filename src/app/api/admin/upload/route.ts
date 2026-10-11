// Tek bir görseli R2'ye yükler. Panel her sayfayı ayrı istekle gönderir;
// böylece Vercel'in istek başına ~4,5 MB sınırına takılmayız.
import { randomBytes } from "node:crypto";
import { isAdmin } from "@/lib/auth";
import { publicUrl, putObject } from "@/lib/r2";
import { SLUG_PATTERN } from "@/lib/slug";

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/avif": "avif",
  "image/gif": "gif",
};

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  if (!(await isAdmin())) return fail(401, "Oturum süresi doldu, tekrar giriş yap.");

  const form = await request.formData();
  const file = form.get("file");
  const slug = String(form.get("slug") ?? "");
  const kind = String(form.get("kind") ?? "");

  if (!(file instanceof File)) return fail(400, "Dosya bulunamadı.");
  if (!SLUG_PATTERN.test(slug)) return fail(400, "Geçersiz seri adresi.");
  const ext = TYPES[file.type];
  if (!ext) return fail(400, `${file.name}: desteklenmeyen dosya türü (WebP, JPG, PNG, AVIF, GIF).`);
  if (file.size > MAX_BYTES) return fail(400, `${file.name}: 4 MB'tan büyük.`);

  const rand = randomBytes(4).toString("hex");
  let key: string;
  if (kind === "cover") {
    key = `series/${slug}/cover-${rand}.${ext}`;
  } else if (kind === "page") {
    const chapter = Number(form.get("chapter"));
    const index = Number(form.get("index"));
    if (!Number.isInteger(chapter) || chapter < 1 || !Number.isInteger(index) || index < 1) {
      return fail(400, "Geçersiz bölüm veya sayfa numarası.");
    }
    key = `series/${slug}/${chapter}/${String(index).padStart(3, "0")}-${rand}.${ext}`;
  } else {
    return fail(400, "Geçersiz yükleme türü.");
  }

  await putObject(key, new Uint8Array(await file.arrayBuffer()), file.type);
  return Response.json({ url: publicUrl(key) });
}
