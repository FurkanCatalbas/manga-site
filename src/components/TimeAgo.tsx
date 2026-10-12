"use client";

import { useSyncExternalStore } from "react";
import { formatDate } from "@/lib/series";

const noopSubscribe = () => () => {};
const DAY = 24 * 3600 * 1000;

function relative(iso: string, now: number) {
  const diff = now - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "az önce";
  if (min < 60) return `${min} dk önce`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
  return formatDate(iso);
}

/** Sunucuda tarih, tarayıcıda "3 gün önce" gösterir. */
export function TimeAgo({ iso, className }: { iso: string; className?: string }) {
  const text = useSyncExternalStore(
    noopSubscribe,
    () => relative(iso, Date.now()),
    () => formatDate(iso),
  );
  return (
    <time dateTime={iso} title={formatDate(iso)} className={className}>
      {text}
    </time>
  );
}

/** Son 3 gün içinde eklenen bölümler için "Yeni" etiketi. */
export function NewBadge({ iso }: { iso: string }) {
  const fresh = useSyncExternalStore(
    noopSubscribe,
    () => Date.now() - new Date(iso).getTime() < 3 * DAY,
    () => false,
  );
  if (!fresh) return null;
  return (
    <span className="rounded-full bg-fresh/15 px-1.5 py-px text-[10px] font-bold tracking-wide text-fresh uppercase">Yeni</span>
  );
}

/** Tarih son `days` gün içindeyse çocukları gösterir. Sunucuda (önbellekli HTML'de) hiç gösterilmez. */
export function Fresh({ iso, days, children }: { iso?: string; days: number; children: React.ReactNode }) {
  const fresh = useSyncExternalStore(
    noopSubscribe,
    () => !!iso && Date.now() - new Date(iso).getTime() < days * DAY,
    () => false,
  );
  return fresh ? children : null;
}
