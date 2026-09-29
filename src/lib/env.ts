import "server-only";
import { z } from "zod";

const secret = (name: string) =>
  z.string().min(32, `${name} must be at least 32 characters (openssl rand -hex 32)`);

const postgresUrl = z
  .string()
  .regex(/^postgres(ql)?:\/\//, "must be a postgres:// or postgresql:// URL");

// Blank values (e.g. `FOO=""` copied from .env.example) count as unset for optional vars.
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // Runtime connection. On serverless hosts use the provider's pooled URL.
    DATABASE_URL: postgresUrl,
    // Migrations only (prisma.config.ts): a direct/session connection. Falls back to DATABASE_URL.
    DIRECT_URL: optional(postgresUrl),
    // Max connections per server instance (keep small on serverless).
    DATABASE_POOL_MAX: optional(z.coerce.number().int().min(1).max(50)),
    // PEM of the database's root CA (e.g. Supabase's). When set, TLS is required and the
    // server certificate is verified against it. Don't also put sslmode in DATABASE_URL.
    DATABASE_SSL_CA: optional(z.string().includes("BEGIN CERTIFICATE", { message: "must be a PEM certificate" })),
    TEST_DATABASE_URL: optional(postgresUrl),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    NEXTAUTH_SECRET: secret("NEXTAUTH_SECRET"),
    NEXTAUTH_URL: z.url(),
    PARTICIPANT_HASH_SECRET: secret("PARTICIPANT_HASH_SECRET"),
    // Raw comma-separated list; parsing/normalising is Agent 2's job (src/lib/auth).
    ADMIN_EMAILS: z.string().default(""),
    // Optional shared rate-limit store (src/lib/rate-limit.ts). Set both or neither.
    UPSTASH_REDIS_REST_URL: optional(z.url()),
    UPSTASH_REDIS_REST_TOKEN: optional(z.string().min(1)),
  })
  .refine((e) => !e.UPSTASH_REDIS_REST_URL === !e.UPSTASH_REDIS_REST_TOKEN, {
    path: ["UPSTASH_REDIS_REST_TOKEN"],
    message: "set both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or neither",
  })
  // node-postgres lets sslmode in the URL override the ssl option, silently dropping the CA.
  .refine((e) => !e.DATABASE_SSL_CA || !/[?&]sslmode=/.test(e.DATABASE_URL), {
    path: ["DATABASE_URL"],
    message: "remove sslmode from DATABASE_URL when DATABASE_SSL_CA is set (it would override the CA)",
  });

export type Env = z.infer<typeof EnvSchema>;

/** Validates an env-like object. Throws one error listing every problem (values are never printed). */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${problems}`);
  }
  return result.data;
}

let cached: Env | undefined;

/** Validated env. Parsed on first access so that importing this module never throws by itself. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

/** Convenience proxy: `env.DATABASE_URL` validates the whole environment on first use. */
export const env: Env = new Proxy({} as Env, {
  get: (_target, key) => getEnv()[key as keyof Env],
});
