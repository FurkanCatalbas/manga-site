// Seri sayfasının paylaşım görseli (og:image). Kapak ve seri adı.
import { getSeries } from "@/lib/data";
import { shareImage } from "@/lib/share-image";

export async function GET(_: Request, ctx: RouteContext<"/paylasim/[slug]">) {
  const series = await getSeries((await ctx.params).slug);
  if (!series) return new Response("Bulunamadı", { status: 404 });
  return shareImage({ title: series.title, cover: series.cover });
}
