import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

export * from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    // Serverless hosts run many instances: keep each pool small and release idle
    // connections quickly so the database's connection limit isn't exhausted.
    max: env.DATABASE_POOL_MAX ?? (env.NODE_ENV === "production" ? 3 : 10),
    idleTimeoutMillis: 10_000,
    // Env var UIs often store newlines as literal "\n".
    ...(env.DATABASE_SSL_CA && {
      ssl: { ca: env.DATABASE_SSL_CA.replace(/\\n/g, "\n"), rejectUnauthorized: true },
    }),
  });
  // Only warnings/errors: query logging could leak participant data into logs.
  return new PrismaClient({ adapter, log: ["warn", "error"] });
}

function getClient(): PrismaClient {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

/**
 * Prisma client singleton (reused across dev hot reloads). Created on first use, not on import:
 * `next build` imports route modules to read their config, and that must not require runtime
 * secrets. Env is validated on the first query instead (and at server start, in instrumentation.ts).
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
