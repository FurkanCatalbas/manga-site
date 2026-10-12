// Hesap ve topluluk tablolarının SQL'ini üretir: src/lib/topluluk-sql.ts (panelde gösterilen, kullanıcının
// Neon'da çalıştırdığı metin). Şemaya topluluk tablosu eklenince/değişince çalıştır: npm run db:topluluk-sql
// drizzle-kit generate çıktısından bu tabloların satırlarını alır ve tekrar çalıştırılabilir hâle getirir
// (CREATE ... IF NOT EXISTS, kısıtlar "zaten var" hatasını yutan DO bloklarında).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TABLES = [
  "users", "sessions", "accounts", "verifications", "comments", "comment_likes", "comment_reports",
  "chapter_reactions", "profiles", "series_ratings", "lists", "list_items", "forum_topics", "forum_posts",
  "forum_reports", "chat_messages",
];

const out = mkdtempSync(join(tmpdir(), "dk-"));
const config = join(process.cwd(), "drizzle.community.tmp.config.mjs");
writeFileSync(config, `export default { schema: "./src/db/schema.ts", out: ${JSON.stringify(out)}, dialect: "postgresql" };\n`);
try {
  execFileSync("npx", ["drizzle-kit", "generate", "--config", config], { stdio: "inherit" });
} finally {
  rmSync(config);
}
const raw = readdirSync(out)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(join(out, f), "utf8"))
  .join("\n");
rmSync(out, { recursive: true });

const mentions = (l) => TABLES.some((t) => l.includes(`"${t}"`));
const rank = (l) => (l.startsWith('CREATE TABLE "users"') ? 0 : l.startsWith("CREATE TABLE") ? 1 : l.startsWith("ALTER") ? 2 : 3);
const lines = raw
  .replace(/\n/g, "")
  .split("--> statement-breakpoint")
  .map((l) => l.trim())
  .filter((l) => l && mentions(l))
  .sort((a, b) => rank(a) - rank(b));

const sql = lines
  .map((l) => {
    if (l.startsWith("CREATE TABLE")) {
      return l.replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ").replace(/\(\t/, "(\n  ").replace(/,\t/g, ",\n  ").replace(/\);$/, "\n);");
    }
    if (l.startsWith("CREATE INDEX")) return l.replace("CREATE INDEX ", "CREATE INDEX IF NOT EXISTS ");
    if (l.startsWith("ALTER TABLE")) return `DO $$ BEGIN ${l} EXCEPTION WHEN duplicate_object THEN NULL; END $$;`;
    return l;
  })
  .join("\n");

writeFileSync(
  "src/lib/topluluk-sql.ts",
  `// Hesap ve topluluk tablolarını oluşturan SQL (Neon → SQL Editor'de çalıştırılır; npm run db:push ile aynı).
// Tekrar çalıştırılabilir: var olan tablo, dizin ve kısıtlar atlanır. Elle düzenleme: npm run db:topluluk-sql
// ile scripts/generate-community-sql.mjs üretir. Panel → Yorumlar tablolar yoksa bunu gösterir.
export const COMMUNITY_SQL = \`${sql.replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}\`;
`,
);
console.log(`src/lib/topluluk-sql.ts yazıldı (${lines.length} ifade).`);
