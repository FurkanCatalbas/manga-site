// Tarayıcıdan /api/admin/upload'a tek dosya gönderir; R2 adresini ve sunucuda
// küçültülmüş görselin boyutlarını döner.

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const IMAGE_EXT = /\.(webp|jpe?g|png|avif|gif)$/i;
/** Dosya seçicide gösterilecek türler; uzantılar da eklenir çünkü Windows .webp türünü bazen bilmez. */
export const ACCEPT_IMAGES = "image/webp,image/jpeg,image/png,image/avif,image/gif,.webp,.jpg,.jpeg,.png,.avif,.gif";

/** Türü boş gelse bile uzantısından görsel olduğu anlaşılan dosyaları kabul eder. */
export function isImageFile(f: File) {
  return f.type.startsWith("image/") || IMAGE_EXT.test(f.name);
}

export async function uploadImage(
  file: File,
  fields: { slug: string; kind: "cover" } | { slug: string; kind: "page"; chapter: number; index: number },
): Promise<{ url: string; width: number; height: number }> {
  const form = new FormData();
  form.set("file", file);
  for (const [k, v] of Object.entries(fields)) form.set(k, String(v));

  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `${file.name} yüklenemedi (${res.status}).`);
  return data;
}

/** Dosyaları "sayfa 2" < "sayfa 10" olacak şekilde doğal sıraya koyar. */
export function sortByName(files: File[]) {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, "tr", { numeric: true, sensitivity: "base" }),
  );
}
