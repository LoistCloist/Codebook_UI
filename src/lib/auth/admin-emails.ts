// Pure helpers for ADMIN_EMAILS. Used only inside the Auth.js jwt callback; emails are never stored or logged.

/** Parses a comma-separated ADMIN_EMAILS value: trimmed, lower-cased, blanks dropped. */
export function parseAdminEmails(raw: string | undefined | null): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0),
  );
}

/** Case-insensitive, whitespace-tolerant membership check. */
export function isAdminEmail(email: string | null | undefined, admins: Set<string>): boolean {
  if (typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 && admins.has(normalized);
}
