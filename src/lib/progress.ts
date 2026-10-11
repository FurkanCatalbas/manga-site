// Okuma geçmişi. Giriş sistemi eklenene kadar tarayıcıda (localStorage) tutulur.

const KEY = "mangaoku:progress";

export type Progress = { chapter: number; page: number; updatedAt: number };

type Store = Record<string, Progress>;

function read(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function getProgress(slug: string): Progress | undefined {
  return read()[slug];
}

export function saveProgress(slug: string, chapter: number, page: number) {
  const store = read();
  store[slug] = { chapter, page, updatedAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(store));
}
