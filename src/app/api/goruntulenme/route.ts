// Okuyucu bir bölümü açtığında serinin toplam ve günlük okunma sayacını bir artırır.
//
// Tekrar sayım sunucuda engellenir: aynı ziyaretçi (IP) aynı bölümü günde bir kez sayılır.
// IP'nin kendisi saklanmaz; günle tuzlanmış özeti tutulur ve iki günden eski kayıtlar silinir.
// Tarayıcı da aynı bölümü günde bir kez gönderir (bkz. Reader içindeki useCountView);
// bu yalnızca gereksiz istekleri azaltır, asıl koruma buradadır.
import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { viewHits } from "@/db/schema";
import { SLUG_PATTERN } from "@/lib/slug";

/** İstanbul saatine göre bugün, "YYYY-MM-DD". */
const istanbulToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());

function clientIp(request: Request) {
  const h = request.headers;
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  // Başka sitelerden gönderilen istekleri reddet
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return new Response(null, { status: 403 });
  }

  const { slug, chapter } = await request.json().catch(() => ({}));
  if (typeof slug !== "string" || !SLUG_PATTERN.test(slug) || !Number.isInteger(chapter) || chapter < 0) {
    return new Response(null, { status: 400 });
  }

  const day = istanbulToday();
  const visitor = createHash("sha256")
    .update(`${day}:${clientIp(request)}:${process.env.VIEW_SALT ?? ""}`)
    .digest("base64url");

  // Tek ifadede: bölüm gerçekten varsa ve bu ziyaretçi bugün saymadıysa iki sayacı da artır.
  // Var olmayan bölüm numaralarıyla sayaç şişirilemez.
  await db.execute(sql`
    with ch as (
      select c.id, c.series_id from chapters c
      join series s on s.id = c.series_id
      where s.slug = ${slug} and c.number = ${chapter}
    ), hit as (
      insert into view_hits (visitor, chapter_id, day)
      select ${visitor}, id, ${day}::date from ch
      on conflict do nothing
      returning chapter_id
    ), bump as (
      update series set views = views + 1
      where id = (select series_id from ch) and exists (select 1 from hit)
      returning id
    )
    insert into series_views_daily (series_id, day, views)
    select id, ${day}::date, 1 from bump
    on conflict (series_id, day) do update set views = series_views_daily.views + 1
  `);

  // Ara sıra eski kayıtları temizle (yanıt gönderildikten sonra)
  if (Math.random() < 0.02) {
    after(() => db.delete(viewHits).where(lt(viewHits.day, sql`${day}::date - 1`)));
  }

  return new Response(null, { status: 204 });
}
