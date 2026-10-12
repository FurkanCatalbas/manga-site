// Bölüm sayfasının paylaşım görseli (og:image). Kapak, seri adı ve "N. bölüm".
import { getSeries } from "@/lib/data";
import { shareImage } from "@/lib/share-image";

export async function GET(_: Request, ctx: RouteContext<"/paylasim/[slug]/[no]">) {
  const { slug, no } = await ctx.params;
  const series = await getSeries(slug);
  const chapter = Number(no);
  if (!series || !series.chapters.some((c) => c.number === chapter)) return new Response("Bulunamadı", { status: 404 });
  return shareImage({ title: series.title, cover: series.cover, chapter });
}
