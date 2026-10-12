// Marka işareti (gözlük) için tek kaynak. Hem sitedeki logo (Brand.tsx) hem de
// sekme/uygulama ikonları (scripts/generate-icons.ts) buradan üretilir.
// İşaret değişirse: MARK_VARIANT'ı değiştir, sonra `npm run icons`.

export const BRAND_COLORS = { accent: "#ff4f8b", accent2: "#8b5cf6", fg: "#eef0f6", bg: "#0a0b10" } as const;

/**
 * Gözlük, yazı logosundaki "oo"dan gelir: sol cam `webto`'nun beyaz "o"su, sağ cam `oku`'nun mor "o"su.
 * halka: ince çerçeveli gözlük · dolu: dolu camlar · harf: "oo" gibi kalın halkalar
 */
export type MarkVariant = "halka" | "dolu" | "harf";
export const MARK_VARIANT: MarkVariant = "halka";

const L = BRAND_COLORS.fg; // sol: beyaz
const R = BRAND_COLORS.accent2; // sağ: mor

// 64×64'lük alanda çizimler. Köprü, `url(#<id>-b)` gradyanıyla beyazdan mora geçer.
const SHAPES: Record<MarkVariant, (id: string) => string> = {
  halka: (id) => `
    <g fill="none" stroke-width="5" stroke-linecap="round">
      <circle cx="19" cy="34" r="10.5" stroke="${L}"/>
      <path d="M8.8 31 L5.5 25.5" stroke="${L}"/>
      <circle cx="45" cy="34" r="10.5" stroke="${R}"/>
      <path d="M55.2 31 L58.5 25.5" stroke="${R}"/>
      <path d="M29.5 32.5 Q32 28 34.5 32.5" stroke="url(#${id}-b)"/>
    </g>`,
  dolu: (id) => `
    <path d="M29 32 Q32 27.5 35 32" fill="none" stroke="url(#${id}-b)" stroke-width="4.5" stroke-linecap="round"/>
    <circle cx="19" cy="34" r="11.5" fill="${L}"/>
    <circle cx="45" cy="34" r="11.5" fill="${R}"/>
    <ellipse cx="40.5" cy="29.5" rx="3.6" ry="2.3" fill="#fff" opacity=".5" transform="rotate(-35 40.5 29.5)"/>`,
  harf: () => `
    <g fill="none" stroke-width="8">
      <circle cx="21.5" cy="32" r="10" stroke="${L}"/>
      <circle cx="42.5" cy="32" r="10" stroke="${R}"/>
    </g>`,
};

/**
 * İşaretin SVG metni.
 * - background: koyu zemin; "rounded" köşeleri yuvarlatılmış (sekme ikonu), "square" tam kare
 *   (iPhone ve Android köşeleri kendisi kırpar)
 * - scale: işareti merkezden küçültür (maskable ikonların güvenli alanı için)
 */
export function markSvg({
  variant = MARK_VARIANT,
  background = false,
  scale = 1,
  id = "wk",
  size,
}: { variant?: MarkVariant; background?: false | "rounded" | "square"; scale?: number; id?: string; size?: number } = {}) {
  const { accent2, bg } = BRAND_COLORS;
  const dims = size ? ` width="${size}" height="${size}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"${dims}>
  <defs>
    <linearGradient id="${id}-b" gradientUnits="userSpaceOnUse" x1="29" y1="0" x2="35" y2="0">
      <stop offset="0" stop-color="${L}"/>
      <stop offset="1" stop-color="${R}"/>
    </linearGradient>
    <radialGradient id="${id}-glow" cx=".5" cy=".2" r=".8">
      <stop offset="0" stop-color="${accent2}" stop-opacity=".35"/>
      <stop offset="1" stop-color="${accent2}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${background ? `<rect width="64" height="64" rx="${background === "rounded" ? 14 : 0}" fill="${bg}"/><rect width="64" height="64" rx="${background === "rounded" ? 14 : 0}" fill="url(#${id}-glow)"/>` : ""}
  <g transform="translate(32 32) scale(${scale}) translate(-32 -32)">${SHAPES[variant](id)}</g>
</svg>`;
}

// Yazı logosundaki "oo": Dela Gothic One'da "o"nun ölçüleri (em, satır yüksekliği 1, tracking-tight)
// genişlik 0.711em, mürekkep x 0.03–0.71em, y 0.375–0.945em. Köprü görünsün diye arada boşluk açılır.
export const O_ADVANCE = 0.711;
export const O_GAP = 0.08;

/** İki "o"yu kaplayan alana (genişlik 2·0.711 + boşluk, yükseklik 1em) çizilen köprü: beyazdan mora. */
export function bridgeSvg(id = "br") {
  const { fg, accent2 } = BRAND_COLORS;
  const w = 2 * O_ADVANCE + O_GAP;
  const x1 = 0.651; // sol "o"nun sağ kenarı
  const x2 = O_ADVANCE + O_GAP + 0.089; // sağ "o"nun sol kenarı
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 1" width="100%" height="100%" overflow="visible" fill="none">
  <defs>
    <linearGradient id="${id}-g" gradientUnits="userSpaceOnUse" x1="${x1}" y1="0" x2="${x2}" y2="0">
      <stop offset="0" stop-color="${fg}"/>
      <stop offset="1" stop-color="${accent2}"/>
    </linearGradient>
  </defs>
  <path d="M${x1} 0.53 Q${(x1 + x2) / 2} 0.37 ${x2} 0.53" stroke="url(#${id}-g)" stroke-width="0.095" stroke-linecap="round"/>
</svg>`;
}
