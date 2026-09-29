import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { ensureParticipant } from "@/lib/flow/participant";
import { serveCurrentScenario } from "@/lib/flow/scenario";
import { DEMOGRAPHICS, answerFor, call, counts, resetDb, routes, signInAs, signOut, startParticipant } from "./helpers";

vi.mock("@/lib/auth/session", async () => (await import("./auth-mock")).sessionMock);
vi.mock("@/lib/auth/consent-cookie", async () => (await import("./auth-mock")).consentMock);

// Order enforcement and request checks against the real database.
describe("write guards", () => {
  beforeEach(resetDb);

  it("an out-of-order scenarioId returns 403 and writes nothing", async () => {
    const participant = await startParticipant("google-sub-order");
    const order = participant.scenarioOrder;
    expect(order.length).toBeGreaterThanOrEqual(2);
    await serveCurrentScenario(participant.id);
    const before = await db.response.findMany();

    const res = await call(routes.responses, answerFor(order[1]));
    expect(res).toEqual({ status: 403, body: { ok: false, error: "wrong_step", next: "/scenario" } });

    const unknown = await call(routes.responses, answerFor("not-a-scenario"));
    expect(unknown).toMatchObject({ status: 403, body: { error: "wrong_step" } });

    expect(await db.response.findMany()).toEqual(before);
    expect(before.every((r) => r.answeredAt === null)).toBe(true);
  });

  it("answering the current scenario before it was served returns 403", async () => {
    const participant = await startParticipant("google-sub-unserved");
    const res = await call(routes.responses, answerFor(participant.scenarioOrder[0]));
    expect(res).toMatchObject({ status: 403, body: { error: "wrong_step", next: "/scenario" } });
    expect((await counts()).responses).toBe(0);
  });

  it("scenario answers before the primer return 403", async () => {
    signInAs("google-sub-early");
    const created = await ensureParticipant();
    const scenarioId = created!.participant.scenarioOrder[0];
    expect(await call(routes.responses, answerFor(scenarioId))).toEqual({
      status: 403,
      body: { ok: false, error: "wrong_step", next: "/demographics" },
    });
    expect(await call(routes.demographics, DEMOGRAPHICS)).toMatchObject({ status: 200 });
    expect(await call(routes.responses, answerFor(scenarioId))).toMatchObject({
      status: 403,
      body: { error: "wrong_step", next: "/primer" },
    });
    expect((await counts()).responses).toBe(0);
  });

  it.each([
    ["a foreign Origin", { origin: "https://evil.example" }],
    ["a missing Origin", { origin: undefined }],
    ["a null Origin", { origin: "null" }],
  ])("rejects %s with 403 bad_origin on every write route", async (_label, headers) => {
    signInAs("google-sub-csrf");
    await ensureParticipant();
    for (const route of [routes.demographics, routes.comprehension, routes.responses]) {
      expect(await call(route, DEMOGRAPHICS, headers)).toEqual({ status: 403, body: { ok: false, error: "bad_origin" } });
    }
    const p = await db.participant.findFirstOrThrow();
    expect(p.demographicsAt).toBeNull();
  });

  it("rejects a non-JSON content type with 415", async () => {
    signInAs("google-sub-ct");
    await ensureParticipant();
    const res = await call(routes.demographics, DEMOGRAPHICS, { "content-type": "application/x-www-form-urlencoded" });
    expect(res).toEqual({ status: 415, body: { ok: false, error: "unsupported_media_type" } });
    expect((await db.participant.findFirstOrThrow()).demographicsAt).toBeNull();
  });

  it("rejects writes without a session with 401, and without a participant row with 403", async () => {
    signOut();
    expect(await call(routes.demographics, DEMOGRAPHICS)).toEqual({
      status: 401,
      body: { ok: false, error: "unauthorized", next: "/" },
    });
    signInAs("google-sub-no-row");
    expect(await call(routes.demographics, DEMOGRAPHICS)).toEqual({
      status: 403,
      body: { ok: false, error: "no_participant", next: "/" },
    });
    expect(await counts()).toEqual({ participants: 0, responses: 0 });
  });

  it("demographics can be saved only once (409)", async () => {
    signInAs("google-sub-twice");
    await ensureParticipant();
    expect(await call(routes.demographics, DEMOGRAPHICS)).toMatchObject({ status: 200 });
    expect(await call(routes.demographics, { ...DEMOGRAPHICS, country: "FR" })).toMatchObject({
      status: 409,
      body: { error: "already_submitted" },
    });
    expect((await db.participant.findFirstOrThrow()).country).toBe("DE");
  });
});
