// Canlı sohbet: tek oda, mesajlar veritabanında. Tarayıcı birkaç saniyede bir /api/sohbet'e yeni
// mesajları sorar (yoklama). Ayrı bir canlı bağlantı servisi gerekmez; kalabalıklaşırsa Pusher/Ably'ye geçilebilir.
import { and, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { chatMessages, users } from "@/db/schema";
import { isMissingTable } from "@/lib/genres";

export const CHAT_MAX = 500;
export const CHAT_KEEP_DAYS = 30;

export type ChatMessage = {
  id: number;
  body: string;
  createdAt: string;
  user: { username: string; image: string | null };
};

/** `after` verilirse ondan yeni mesajlar (en fazla 100), yoksa son 60 mesaj; eskiden yeniye. Tablo yoksa null. */
export async function getChatMessages(after?: number, before?: number): Promise<ChatMessage[] | null> {
  try {
    const rows = await db
      .select({
        id: chatMessages.id,
        body: chatMessages.body,
        createdAt: chatMessages.createdAt,
        username: users.username,
        image: users.image,
      })
      .from(chatMessages)
      .innerJoin(users, eq(users.id, chatMessages.userId))
      .where(
        and(
          eq(chatMessages.deleted, false),
          after ? gt(chatMessages.id, after) : undefined,
          before ? lt(chatMessages.id, before) : undefined,
        ),
      )
      .orderBy(after ? chatMessages.id : desc(chatMessages.id))
      .limit(after ? 100 : 60);
    const list = after ? rows : rows.reverse();
    return list.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: new Date(r.createdAt).toISOString(),
      user: { username: r.username ?? "okur", image: r.image },
    }));
  } catch (e) {
    if (isMissingTable(e)) return null;
    throw e;
  }
}
