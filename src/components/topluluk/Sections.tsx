// Sunucu tarafı sarmalayıcılar: yorumların ilk sayfasını ve tepki sayılarını (önbellekli) getirir.
// Hesaplar kapalıysa ya da tablolar yoksa hiçbir şey göstermez.
import { authProviders } from "@/lib/hesap";
import { getComments, getReactionCounts, REACTIONS, resolveScope } from "@/lib/topluluk";
import { Comments } from "./Comments";
import { Reactions } from "./Reactions";

const loginHref = (path: string) => `/giris?geri=${encodeURIComponent(path)}`;
const pathOf = (slug: string, chapter?: number) => (chapter ? `/seri/${slug}/bolum/${chapter}` : `/seri/${slug}`);

export async function CommentsSection({ slug, chapter, preview }: { slug: string; chapter?: number; preview?: number }) {
  if (!authProviders.enabled) return null;
  const scope = await resolveScope({ slug, chapter });
  const page = scope && (await getComments(scope));
  if (!page) return null;
  return (
    <Comments
      refScope={{ slug, chapter: chapter ?? null }}
      initial={page}
      loginHref={loginHref(`${pathOf(slug, chapter)}#yorumlar-bolumu`)}
      title={chapter ? "Bölüm yorumları" : "Yorumlar"}
      preview={preview}
    />
  );
}

export async function ReactionsSection({ slug, chapter }: { slug: string; chapter: number }) {
  if (!authProviders.enabled) return null;
  const scope = await resolveScope({ slug, chapter });
  const counts = scope?.chapterId ? await getReactionCounts(scope.chapterId) : null;
  if (!counts) return null;
  return (
    <Reactions
      refScope={{ slug, chapter }}
      options={REACTIONS}
      initial={counts}
      loginHref={loginHref(pathOf(slug, chapter))}
    />
  );
}
