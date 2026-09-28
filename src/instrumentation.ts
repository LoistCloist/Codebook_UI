// Runs once when a Next.js server instance starts: fail loudly on bad config.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { getEnv } = await import("@/lib/env");
  const { getScenarios } = await import("@/lib/scenarios");

  getEnv();
  const scenarios = getScenarios();
  console.info(`[startup] env ok; ${scenarios.length} scenarios loaded from data/scenarios.json`);
}
