"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { getProgress } from "@/lib/progress";

const noopSubscribe = () => () => {};

export function ContinueReading({ slug }: { slug: string }) {
  // Sunucuda null, tarayıcıda kayıtlı bölüm numarası
  const chapter = useSyncExternalStore(
    noopSubscribe,
    () => getProgress(slug)?.chapter ?? null,
    () => null,
  );
  if (chapter === null) return null;

  return (
    <Link
      href={`/seri/${slug}/bolum/${chapter}`}
      className="border-[3px] border-ink bg-pink px-5 py-2.5 font-semibold hover:bg-white"
    >
      {chapter}. bölümden devam et
    </Link>
  );
}
