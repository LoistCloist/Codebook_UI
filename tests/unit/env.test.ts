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

  it("treats blank optional values as unset", () => {
    const e = parseEnv({ ...good, DIRECT_URL: "", DATABASE_POOL_MAX: "" });
    expect(e.DIRECT_URL).toBeUndefined();
    expect(e.DATABASE_POOL_MAX).toBeUndefined();
  });

  it("parses DATABASE_POOL_MAX as an integer", () => {
    expect(parseEnv({ ...good, DATABASE_POOL_MAX: "3" }).DATABASE_POOL_MAX).toBe(3);
    expect(() => parseEnv({ ...good, DATABASE_POOL_MAX: "0" })).toThrow(/DATABASE_POOL_MAX/);
  });

  it("rejects sslmode in DATABASE_URL when DATABASE_SSL_CA is set", () => {
    const ca = "-----BEGIN CERTIFICATE-----\\nMIIB\\n-----END CERTIFICATE-----";
    expect(parseEnv({ ...good, DATABASE_SSL_CA: ca }).DATABASE_SSL_CA).toBe(ca);
    expect(() =>
      parseEnv({ ...good, DATABASE_SSL_CA: ca, DATABASE_URL: `${good.DATABASE_URL}?sslmode=require` }),
    ).toThrow(/remove sslmode/);
    expect(() => parseEnv({ ...good, DATABASE_SSL_CA: "not a cert" })).toThrow(/DATABASE_SSL_CA/);
  });
});
