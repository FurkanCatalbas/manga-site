// Dışarıdan bölüm yayınlama (ör. bilgisayardaki Python scripti). Panel oturumu ya da
// `Authorization: Bearer <ADMIN_PASSWORD>` başlığı ister.
//
// GET  ?seri=<slug>  → { chapters: number[] }  serideki mevcut bölüm numaraları
// POST { slug, number, title, pages, pageSizes } → { ok } | { error }  (409: bölüm zaten var)
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { chapters, series } from "@/db/schema";
import { checkPassword, isAdmin } from "@/lib/auth";
import { type ChapterInput, insertChapter } from "@/lib/chapters";

const fail = (status: number, error: string) => Response.json({ error }, { status });

async function authorized(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return checkPassword(auth.slice(7));
  return isAdmin();
}

export async function GET(request: Request) {
  if (!(await authorized(request))) return fail(401, "Yetkisiz.");
  const slug = new URL(request.url).searchParams.get("seri") ?? "";
  const s = await db.query.series.findFirst({
    where: eq(series.slug, slug),
    columns: { id: true },
    with: { chapters: { columns: { number: true }, orderBy: chapters.number } },
  });
  if (!s) return fail(404, "Seri bulunamadı.");
  return Response.json({ chapters: s.chapters.map((c) => c.number) });
}

export async function POST(request: Request) {
  if (!(await authorized(request))) return fail(401, "Yetkisiz.");
  let input: ChapterInput;
  try {
    input = await request.json();
  } catch {
    return fail(400, "Geçersiz JSON.");
  }
  const result = await insertChapter(input);
  if ("error" in result) return fail(result.conflict ? 409 : 400, result.error);
  // Route handler'da updateTag yok; { expire: 0 } ile eski sayfa gösterilmez, bölüm hemen görünür
  revalidateTag("series", { expire: 0 });
  return Response.json(result);
}
