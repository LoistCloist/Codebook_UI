// Runs once when a Next.js server instance starts: fail loudly on bad config.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { getEnv } = await import("@/lib/env");
  const { getScenarios, scenariosMissingKeys } = await import("@/lib/scenarios");

  const env = getEnv();
  const scenarios = getScenarios();
  if (env.NODE_ENV === "production" && !env.UPSTASH_REDIS_REST_URL) {
    console.warn("[startup] UPSTASH_REDIS_REST_URL not set: rate limiting is per-instance only");
  }
  const unkeyed = scenariosMissingKeys(scenarios);
  if (unkeyed.length > 0) {
    console.warn(
      `[startup] ${unkeyed.length} scenario(s) have no answerKey and are excluded from agreement scores: ${unkeyed.join(", ")}`,
    );
  }
  console.info(`[startup] env ok; ${scenarios.length} scenarios loaded from data/scenarios.json`);
}
