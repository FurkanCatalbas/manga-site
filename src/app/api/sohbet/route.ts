// Sohbet yoklaması: GET /api/sohbet?sonra=<id> yeni mesajları, ?once=<id> daha eskileri döner.
// Silinen mesajların kimlikleri de gönderilir ki açık ekranlardan kalksın.
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { getChatMessages } from "@/lib/sohbet";

const num = (v: string | null) => (v && /^\d{1,9}$/.test(v) ? Number(v) : undefined);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const after = num(params.get("sonra"));
  const before = num(params.get("once"));
  const messages = await getChatMessages(after, before);
  if (!messages) return Response.json({ messages: [], deleted: [], closed: true });

  // Son 10 dakikada yazılıp silinenler (açık ekranlar kaldırsın)
  const deleted = after
    ? (
        await db
          .select({ id: chatMessages.id })
          .from(chatMessages)
          .where(and(eq(chatMessages.deleted, true), gt(chatMessages.createdAt, sql`now() - interval '10 minutes'`)))
      ).map((r) => r.id)
    : [];
  return Response.json({ messages, deleted }, { headers: { "Cache-Control": "no-store" } });
}
