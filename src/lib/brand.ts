// Marka işareti (gözlük) için tek kaynak. Hem sitedeki logo (Brand.tsx) hem de
// sekme/uygulama ikonları (scripts/generate-icons.ts) buradan üretilir.
// İşaret değişirse: MARK_VARIANT'ı değiştir, sonra `npm run icons`.

export const BRAND_COLORS = { accent: "#ff4f8b", accent2: "#8b5cf6", bg: "#0a0b10" } as const;

/** halka: ince çerçeveli gözlük · dolu: parlayan gradyan camlar · harf: "oo" gibi kalın halkalar */
export type MarkVariant = "halka" | "dolu" | "harf";
export const MARK_VARIANT: MarkVariant = "halka";

// 64×64'lük alanda çizimler; renk `url(#<id>-g)` gradyanından gelir. Gradyan tüm çizime tek parça
// yayılır (userSpaceOnUse); yoksa camlar, köprü ve saplar ayrı ayrı renklenir.
const SHAPES: Record<MarkVariant, (id: string) => string> = {
  halka: (id) => `
    <g fill="none" stroke="url(#${id}-g)" stroke-width="5" stroke-linecap="round">
      <circle cx="19" cy="34" r="10.5"/>
      <circle cx="45" cy="34" r="10.5"/>
      <path d="M29.5 32.5 Q32 28 34.5 32.5"/>
      <path d="M8.8 31 L5.5 25.5"/>
      <path d="M55.2 31 L58.5 25.5"/>
    </g>`,
  dolu: (id) => `
    <path d="M29 32 Q32 27.5 35 32" fill="none" stroke="url(#${id}-g)" stroke-width="4.5" stroke-linecap="round"/>
    <circle cx="19" cy="34" r="11.5" fill="url(#${id}-g)"/>
    <circle cx="45" cy="34" r="11.5" fill="url(#${id}-g)"/>
    <ellipse cx="14.5" cy="29.5" rx="3.6" ry="2.3" fill="#fff" opacity=".6" transform="rotate(-35 14.5 29.5)"/>
    <ellipse cx="40.5" cy="29.5" rx="3.6" ry="2.3" fill="#fff" opacity=".6" transform="rotate(-35 40.5 29.5)"/>`,
  harf: (id) => `
    <g fill="none" stroke="url(#${id}-g)" stroke-width="8">
      <circle cx="21.5" cy="32" r="10"/>
      <circle cx="42.5" cy="32" r="10"/>
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
  const { accent, accent2, bg } = BRAND_COLORS;
  const dims = size ? ` width="${size}" height="${size}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"${dims}>
  <defs>
    <linearGradient id="${id}-g" gradientUnits="userSpaceOnUse" x1="4" y1="20" x2="60" y2="48">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset="1" stop-color="${accent2}"/>
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
