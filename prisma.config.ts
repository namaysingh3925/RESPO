/**
 * Prisma 7 CLI configuration (generate, migrate, seed, studio).
 * The runtime client in lib/db.ts reads the same DATABASE_URL, and both resolve a relative
 * `file:` path against the project root, so the CLI and the app always use the same SQLite file.
 */
import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

const projectRoot = __dirname;

/** Turns `file:./prisma/dev.db` into an absolute `file:` URL anchored at the project root. */
function resolveSqliteUrl(url: string): string {
  if (!url.startsWith("file:")) return url;
  const filePath = url.slice("file:".length);
  if (filePath === ":memory:" || path.isAbsolute(filePath)) return url;
  return `file:${path.resolve(projectRoot, filePath)}`;
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: resolveSqliteUrl(process.env.DATABASE_URL ?? "file:./prisma/dev.db"),
  },
});
