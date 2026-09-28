import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { defineConfig } from "vitest/config";

loadDotenv({ quiet: true });

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": r("./src"),
      "server-only": r("./tests/stubs/server-only.ts"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["./vitest.integration.setup.ts"],
          // Tests share one database: run files one at a time.
          fileParallelism: false,
          env: { NODE_ENV: "test", DATABASE_URL: process.env.TEST_DATABASE_URL ?? "" },
        },
      },
    ],
    passWithNoTests: true,
  },
});
