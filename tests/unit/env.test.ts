import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const good = {
  DATABASE_URL: "postgresql://u:p@localhost:5433/db",
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
  NEXTAUTH_SECRET: "x".repeat(32),
  NEXTAUTH_URL: "http://localhost:3000",
  PARTICIPANT_HASH_SECRET: "y".repeat(32),
};

describe("parseEnv", () => {
  it("accepts a complete environment", () => {
    expect(parseEnv(good).ADMIN_EMAILS).toBe("");
  });

  it("lists every missing or invalid variable without printing values", () => {
    let message = "";
    try {
      parseEnv({ ...good, NEXTAUTH_SECRET: "short-secret-value", DATABASE_URL: undefined });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/NEXTAUTH_SECRET/);
    expect(message).toMatch(/DATABASE_URL/);
    expect(message).not.toContain("short-secret-value");
  });
});
