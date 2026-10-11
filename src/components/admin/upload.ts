// Tarayıcıdan /api/admin/upload'a tek dosya gönderir, R2 adresini döner.

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export async function uploadImage(
  file: File,
  fields: { slug: string; kind: "cover" } | { slug: string; kind: "page"; chapter: number; index: number },
): Promise<string> {
  const form = new FormData();
  form.set("file", file);
  for (const [k, v] of Object.entries(fields)) form.set(k, String(v));

  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `${file.name} yüklenemedi (${res.status}).`);
  return data.url as string;
}

/** Dosyaları "sayfa 2" < "sayfa 10" olacak şekilde doğal sıraya koyar. */
export function sortByName(files: File[]) {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, "tr", { numeric: true, sensitivity: "base" }),
  );
}
