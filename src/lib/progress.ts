// Okuma geçmişi. Giriş sistemi eklenene kadar tarayıcıda (localStorage) tutulur.
// Yalnızca istemci bileşenlerinden kullanılır.
import { useMemo, useSyncExternalStore } from "react";

const KEY = "mangaoku:progress";

export type Progress = { chapter: number; page: number; updatedAt: number };

type Store = Record<string, Progress>;

function raw(): string {
  try {
    return localStorage.getItem(KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

function parse(json: string): Store {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function getProgress(slug: string): Progress | undefined {
  return parse(raw())[slug];
}

export function saveProgress(slug: string, chapter: number, page: number) {
  const store = parse(raw());
  store[slug] = { chapter, page, updatedAt: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Gizli sekme ya da dolu depolama: geçmiş tutulamaz, okuma etkilenmez
  }
}

// Başka sekmede okunan bölümler de anında yansısın
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

/** Tüm okuma geçmişi; sunucuda ve ilk çizimde boş. */
export function useAllProgress(): Store {
  const json = useSyncExternalStore(subscribe, raw, () => "{}");
  return useMemo(() => parse(json), [json]);
}
