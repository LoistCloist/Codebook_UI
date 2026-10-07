import { describe, expect, it } from "vitest";
import { isAdminEmail, parseAdminEmails } from "@/lib/auth/admin-emails";

describe("parseAdminEmails", () => {
  it("trims, lower-cases and drops blanks", () => {
    expect([...parseAdminEmails("  Alice@Example.com, ,bob@x.org ,,  ")]).toEqual(["alice@example.com", "bob@x.org"]);
  });

  it("handles empty / missing input", () => {
    expect(parseAdminEmails("").size).toBe(0);
    expect(parseAdminEmails(undefined).size).toBe(0);
    expect(parseAdminEmails("   ").size).toBe(0);
  });
});

describe("isAdminEmail", () => {
  const admins = parseAdminEmails("Alice@Example.com,bob@x.org");

  it("matches case-insensitively and ignores surrounding whitespace", () => {
    expect(isAdminEmail("alice@example.com", admins)).toBe(true);
    expect(isAdminEmail("  ALICE@EXAMPLE.COM ", admins)).toBe(true);
    expect(isAdminEmail("BOB@x.org", admins)).toBe(true);
  });

  it("rejects non-members, partial matches and missing emails", () => {
    expect(isAdminEmail("carol@example.com", admins)).toBe(false);
    expect(isAdminEmail("alice@example.co", admins)).toBe(false);
    expect(isAdminEmail("", admins)).toBe(false);
    expect(isAdminEmail(null, admins)).toBe(false);
    expect(isAdminEmail(undefined, admins)).toBe(false);
  });

  it("an empty list admits nobody", () => {
    expect(isAdminEmail("alice@example.com", parseAdminEmails(""))).toBe(false);
  });
});
