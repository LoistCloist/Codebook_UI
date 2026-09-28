import { execSync } from "node:child_process";
import { config as loadDotenv } from "dotenv";

// Applies migrations to TEST_DATABASE_URL before integration tests run.
export default function setup() {
  loadDotenv({ quiet: true });
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error("TEST_DATABASE_URL is not set (see .env.example)");
  if (testUrl === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL: integration tests wipe data");
  }
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl },
  });
}
