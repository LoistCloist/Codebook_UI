import { vi } from "vitest";

/** Stand-in for Prisma.PrismaClientKnownRequestError. */
export class FakeKnownError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export function makeDb() {
  const db = {
    participant: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    response: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
  return db;
}

export const ORIGIN = "http://localhost:3000";

export function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/x`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
