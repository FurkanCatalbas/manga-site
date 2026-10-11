// Geliştirme için örnek kapak ve sayfa görselleri üretir (public/sample/...).
// Gerçek içerik eklendiğinde bu klasöre ihtiyaç kalmaz.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(import.meta.dirname, "..", "public", "sample");

const series = [
  { slug: "golge-avcisi", title: "Gölge Avcısı", hue: 265, chapters: 3 },
  { slug: "son-istasyon", title: "Son İstasyon", hue: 190, chapters: 4 },
  { slug: "kiraz-sokagi", title: "Kiraz Sokağı", hue: 340, chapters: 2 },
];
const PAGES_PER_CHAPTER = 6;

function cover({ title, hue }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="hsl(${hue} 60% 45%)"/><stop offset="1" stop-color="hsl(${hue} 50% 12%)"/>
  </linearGradient></defs>
  <rect width="400" height="600" fill="url(#g)"/>
  <circle cx="200" cy="230" r="120" fill="hsl(${hue} 70% 75% / .25)"/>
  <circle cx="200" cy="230" r="70" fill="hsl(${hue} 80% 85% / .35)"/>
  <text x="200" y="500" font-family="sans-serif" font-size="38" font-weight="700" fill="#fff" text-anchor="middle">${title}</text>
</svg>`;
}

function page({ title, hue }, chapter, n) {
  // Sayfa başına değişen basit panel düzeni
  const layouts = [
    [[20, 20, 760, 520], [20, 560, 370, 520], [410, 560, 370, 520]],
    [[20, 20, 370, 700], [410, 20, 370, 340], [410, 380, 370, 340], [20, 740, 760, 340]],
    [[20, 20, 760, 340], [20, 380, 760, 340], [20, 740, 760, 340]],
  ];
  const panels = layouts[(chapter + n) % layouts.length]
    .map(([x, y, w, h], i) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="hsl(${hue} 30% ${92 - i * 6}%)" stroke="#111" stroke-width="4"/>`)
    .join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100">
  <rect width="800" height="1100" fill="#fff"/>
  ${panels}
  <text x="400" y="540" font-family="sans-serif" font-size="44" font-weight="700" fill="#222" text-anchor="middle">${title}</text>
  <text x="400" y="600" font-family="sans-serif" font-size="30" fill="#555" text-anchor="middle">Bölüm ${chapter} · Sayfa ${n}</text>
</svg>`;
}

for (const s of series) {
  const dir = join(OUT, s.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "cover.svg"), cover(s));
  for (let c = 1; c <= s.chapters; c++) {
    const cdir = join(dir, String(c));
    mkdirSync(cdir, { recursive: true });
    for (let p = 1; p <= PAGES_PER_CHAPTER; p++) {
      writeFileSync(join(cdir, `${p}.svg`), page(s, c, p));
    }
  }
}
console.log("Örnek görseller üretildi:", OUT);
