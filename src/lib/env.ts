import "server-only";
import { z } from "zod";

const secret = (name: string) =>
  z.string().min(32, `${name} must be at least 32 characters (openssl rand -hex 32)`);

const postgresUrl = z
  .string()
  .regex(/^postgres(ql)?:\/\//, "must be a postgres:// or postgresql:// URL");

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: postgresUrl,
  TEST_DATABASE_URL: postgresUrl.optional(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  NEXTAUTH_SECRET: secret("NEXTAUTH_SECRET"),
  NEXTAUTH_URL: z.url(),
  PARTICIPANT_HASH_SECRET: secret("PARTICIPANT_HASH_SECRET"),
  // Raw comma-separated list; parsing/normalising is Agent 2's job (src/lib/auth).
  ADMIN_EMAILS: z.string().default(""),
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
