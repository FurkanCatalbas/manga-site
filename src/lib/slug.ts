const TR: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u" };

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Gölge Avcısı" → "golge-avcisi" */
export function slugify(text: string) {
  return text
    .replace(/[çğıİöşüÇĞÖŞÜ]/g, (c) => TR[c] ?? TR[c.toLocaleLowerCase("tr")] ?? c)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
