import path from "node:path";

export const DEFAULT_DATABASE_URL = "file:./prisma/dev.db";

/**
 * Resolves a SQLite `file:` URL to an absolute path anchored at `root` (the project root).
 * prisma.config.ts applies the same rule, so the Prisma CLI, the seed script and the
 * Next.js runtime all open the same database file regardless of the importing module.
 */
export function resolveSqliteUrl(url: string = DEFAULT_DATABASE_URL, root: string = process.cwd()): string {
  if (!url.startsWith("file:")) return url;
  const filePath = url.slice("file:".length);
  if (filePath === ":memory:" || path.isAbsolute(filePath)) return url;
  return `file:${path.resolve(root, filePath)}`;
}
