import type { Metadata } from "next";
import { ChatRoom } from "@/components/topluluk/ChatRoom";
import { CommunityTabs } from "@/components/topluluk/CommunityShell";

export const metadata: Metadata = {
  title: "Sohbet",
  description: "webtooku okurlarıyla canlı sohbet: seriler, bölümler ve öneriler hakkında konuş.",
  alternates: { canonical: "/sohbet" },
};

export default function ChatPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Sohbet</h1>
        <p className="text-xs text-muted">Saygılı ol, spoiler verme.</p>
      </div>
      <CommunityTabs active="/sohbet" />
      <ChatRoom />
    </div>
  );
}
