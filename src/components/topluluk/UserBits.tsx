"use client";

// Topluluk içeriğinin ortak parçaları: kullanıcı bağlantısı ve spoiler gizlemeli metin.
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/hesap/Avatar";

export const profileHref = (username: string) => `/u/${encodeURIComponent(username)}`;

/** Fotoğraf + @kullanıcıadı, profile gider. */
export function UserLink({
  user,
  size = 32,
  showName = true,
  className = "",
}: {
  user: { username: string; image: string | null } | null;
  size?: number;
  showName?: boolean;
  className?: string;
}) {
  if (!user) return <span className="text-sm text-muted italic">silinmiş</span>;
  return (
    <Link href={profileHref(user.username)} className={`group inline-flex min-w-0 items-center gap-2 ${className}`}>
      <Avatar name={user.username} image={user.image} size={size} />
      {showName && <span className="truncate font-semibold group-hover:text-accent">@{user.username}</span>}
    </Link>
  );
}

/** Kullanıcı metni (düz metin, satır sonları korunur). Spoiler ise dokununca açılır. */
export function UserText({ text, spoiler = false, className = "" }: { text: string; spoiler?: boolean; className?: string }) {
  const [shown, setShown] = useState(!spoiler);
  if (!shown) {
    return (
      <button
        type="button"
        onClick={() => setShown(true)}
        className="mt-1 block w-full rounded-lg bg-white/[0.04] px-3 py-2 text-left text-sm ring-1 ring-white/[0.06] hover:bg-white/[0.07]"
      >
        <span className="font-semibold text-accent">Spoiler</span>
        <span className="text-muted"> · göstermek için dokun</span>
      </button>
    );
  }
  return <p className={`leading-relaxed break-words whitespace-pre-line text-fg/90 ${className}`}>{text}</p>;
}
