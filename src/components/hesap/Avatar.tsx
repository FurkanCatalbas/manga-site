// Kullanıcı fotoğrafı; yoksa kullanıcı adının baş harfi (renk addan türetilir).
const COLORS = ["#ff4f8b", "#8b5cf6", "#22c55e", "#f59e0b", "#06b6d4", "#ef4444", "#6366f1"];

export function Avatar({ name, image, size = 36 }: { name: string; image?: string | null; size?: number }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        referrerPolicy="no-referrer"
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover ring-1 ring-white/10"
        style={{ width: size, height: size }}
      />
    );
  }
  const color = COLORS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORS.length];
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
    >
      {(name.charAt(0) || "?").toLocaleUpperCase("tr")}
    </span>
  );
}
