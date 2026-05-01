import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import fs from "node:fs";
import path from "node:path";

export async function freshTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  const migrationsDir = path.resolve(__dirname, "../../drizzle");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const sqlText = fs.readFileSync(path.join(migrationsDir, f), "utf8");
    for (const statement of sqlText.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) await db.execute(sql.raw(trimmed));
    }
  }
  return { db, client };
}
