import "server-only";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { DEFAULT_DATABASE_URL, resolveSqliteUrl } from "@/lib/services/internal/database-url";

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: resolveSqliteUrl(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL),
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

type AppPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma?: AppPrismaClient };

/**
 * Shared Prisma client. Cached on globalThis outside production so hot reloads in
 * `next dev` reuse one connection instead of opening a new SQLite handle per edit.
 */
export const db: AppPrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
