"use server";

import { and, eq, lt, sql } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { getSessionUser } from "@/lib/hesap";
import { CHAT_KEEP_DAYS, CHAT_MAX, type ChatMessage } from "@/lib/sohbet";
import { cleanText, currentMember, linkCount, LOGIN, recentCount, type Result } from "@/lib/uye";

export async function sendChatMessage(body: string): Promise<Result<{ message: ChatMessage }>> {
  const me = await currentMember();
  if (!me.user) return { ok: false, error: me.error };
  const text = cleanText(body).replace(/\n+/g, " ");
  if (!text) return { ok: false, error: "Boş mesaj gönderilemez." };
  if (text.length > CHAT_MAX) return { ok: false, error: `Mesaj en fazla ${CHAT_MAX} karakter olabilir.` };
  if (linkCount(text) > 1) return { ok: false, error: "Mesajda en fazla 1 bağlantı olabilir." };
  if ((await recentCount(chatMessages, chatMessages.userId, chatMessages.createdAt, me.user.id, 3)) > 0) {
    return { ok: false, error: "Biraz yavaş: 3 saniyede bir mesaj." };
  }
  if ((await recentCount(chatMessages, chatMessages.userId, chatMessages.createdAt, me.user.id, 86400)) >= 500) {
    return { ok: false, error: "Bugünlük mesaj sınırına ulaştın." };
  }
  const [row] = await db
    .insert(chatMessages)
    .values({ userId: me.user.id, body: text })
    .returning({ id: chatMessages.id, createdAt: chatMessages.createdAt });

  // Ara sıra eski mesajları temizle
  if (Math.random() < 0.02) {
    after(() =>
      db.delete(chatMessages).where(lt(chatMessages.createdAt, sql`now() - make_interval(days => ${CHAT_KEEP_DAYS})`)),
    );
  }
  return {
    ok: true,
    message: {
      id: row.id,
      body: text,
      createdAt: row.createdAt.toISOString(),
      user: { username: me.user.username, image: me.user.image },
    },
  };
}

export async function deleteChatMessage(id: number): Promise<Result> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: LOGIN };
  const [r] = await db
    .update(chatMessages)
    .set({ deleted: true })
    .where(and(eq(chatMessages.id, Number(id)), eq(chatMessages.userId, me.id)))
    .returning({ id: chatMessages.id });
  return r ? { ok: true } : { ok: false, error: "Bu mesajı silemezsin." };
}
