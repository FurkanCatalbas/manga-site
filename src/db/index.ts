import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL tanımlı değil. .env.local dosyasını kontrol et.");
}

export const db = drizzle(neon(process.env.DATABASE_URL), { schema });
