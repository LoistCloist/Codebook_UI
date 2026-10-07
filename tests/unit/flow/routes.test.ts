import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeKnownError, makeDb, post } from "./mocks";
import { atPrimer, atScenarios, done, participant } from "./fixtures";

const h = vi.hoisted(() => ({
  db: undefined as unknown as ReturnType<typeof import("./mocks").makeDb>,
}));
const session = vi.hoisted(() => ({ getParticipantHash: vi.fn() }));

vi.mock("@/lib/env", () => ({
  env: { NEXTAUTH_URL: "http://localhost:3000" },
}));
vi.mock("@/lib/auth/session", () => session);
vi.mock("@/lib/auth/consent-cookie", () => ({ readConsentIntent: vi.fn() }));
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
  Prisma: { PrismaClientKnownRequestError: FakeKnownError },
}));

import { POST as postComprehension } from "@/app/api/comprehension/route";
import { POST as postResponses } from "@/app/api/responses/route";

const answer = {
  scenarioId: "s02",
  utilitarian: "maintain",
  kantian: "swerve_left",
};

function withParticipant(p: ReturnType<typeof participant> | null, answered = 0) {
  h.db.participant.findUnique.mockResolvedValue(p);
  h.db.response.count.mockResolvedValue(answered);
}

async function json(r: Response) {
  return { status: r.status, body: await r.json() };
}

beforeEach(() => {
  h.db = makeDb();
  session.getParticipantHash.mockReset().mockResolvedValue("hash-1");
});

describe("shared guard order", () => {
  it("bad origin → 403 before the session is read", async () => {
    const r = await json(await postComprehension(post({ answers: ["consequences", "fewer"] }, { origin: "https://evil.example" })));
    expect(r).toEqual({
      status: 403,
      body: { ok: false, error: "bad_origin" },
    });
    expect(session.getParticipantHash).not.toHaveBeenCalled();
  });

  it("missing origin → 403", async () => {
    const req = new Request("http://localhost:3000/api/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect((await postResponses(req)).status).toBe(403);
  });

  it("form content type → 415", async () => {
    const r = await postComprehension(post("a=b", { "content-type": "application/x-www-form-urlencoded" }));
    expect(r.status).toBe(415);
  });

  it("no session → 401", async () => {
    session.getParticipantHash.mockResolvedValue(null);
    expect(await json(await postComprehension(post({ answers: ["consequences", "fewer"] })))).toEqual({
      status: 401,
      body: { ok: false, error: "unauthorized", next: "/" },
    });
  });

  it("no participant row → 403 no_participant", async () => {
    withParticipant(null);
    expect((await json(await postResponses(post(answer)))).body).toMatchObject({
      error: "no_participant",
    });
  });

  it.each([
    ["comprehension", postComprehension, { answers: ["consequences", "fewer"] }],
    ["responses", postResponses, answer],
  ] as const)("completed participant → 409 on %s, no writes", async (_n, handler, body) => {
    withParticipant(participant(done), 3);
    const r = await json(await handler(post(body)));
    expect(r).toEqual({
      status: 409,
      body: { ok: false, error: "study_completed", next: "/completed" },
    });
    expect(h.db.participant.updateMany).not.toHaveBeenCalled();
    expect(h.db.response.updateMany).not.toHaveBeenCalled();
  });

  it("wrong step → 403 is checked before the body is validated", async () => {
    withParticipant(participant()); // on the primer
    const r = await json(await postResponses(post("{not json")));
    expect(r).toEqual({
      status: 403,
      body: { ok: false, error: "wrong_step", next: "/primer" },
    });
  });

  it("invalid JSON → 422 invalid_json", async () => {
    withParticipant(participant());
    expect((await json(await postComprehension(post("{bad")))).body).toMatchObject({ error: "invalid_json" });
  });
});

describe("POST /api/comprehension", () => {
  it.each([
    [["consequences", "fewer"], true],
    [["duty", "fewer"], false],
  ])("stores %o, passed=%s, and completes the primer", async (answers, passed) => {
    withParticipant(participant(atPrimer));
    h.db.participant.updateMany.mockResolvedValue({ count: 1 });
    expect((await json(await postComprehension(post({ answers })))).body).toEqual({ ok: true, next: "/scenario" });
    const call = h.db.participant.updateMany.mock.calls[0][0];
    expect(call.where).toMatchObject({ primerCompletedAt: null });
    expect(call.data).toMatchObject({
      comprehensionAnswers: answers,
      comprehensionPassed: passed,
    });
    expect(call.data.primerCompletedAt).toBeInstanceOf(Date);
  });

  it("an answer that isn't an option value → 422", async () => {
    withParticipant(participant(atPrimer));
    const r = await json(await postComprehension(post({ answers: ["consequences", "Its overall consequences"] })));
    expect(r).toEqual({
      status: 422,
      body: { ok: false, error: "validation", fields: ["answers.1"] },
    });
  });

  it("second submission → 409", async () => {
    withParticipant(participant(atScenarios));
    expect((await postComprehension(post({ answers: ["consequences", "fewer"] }))).status).toBe(409);
  });
});

describe("POST /api/responses", () => {
  it("before the primer → 403", async () => {
    withParticipant(participant(atPrimer));
    expect((await json(await postResponses(post(answer)))).body).toMatchObject({
      error: "wrong_step",
      next: "/primer",
    });
  });

  it("saves the current scenario with a conditional update", async () => {
    withParticipant(participant(atScenarios), 0);
    h.db.response.updateMany.mockResolvedValue({ count: 1 });
    expect((await json(await postResponses(post(answer)))).body).toEqual({
      ok: true,
      next: "/scenario",
    });
    const call = h.db.response.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({
      participantId: "p1",
      scenarioId: "s02",
      position: 0,
      answeredAt: null,
    });
    expect(call.data).toMatchObject({
      utilitarianChoice: "maintain",
      kantianChoice: "swerve_left",
    });
    expect(h.db.participant.updateMany).not.toHaveBeenCalled();
  });

  it("saves a response without a Kantian answer as null", async () => {
    withParticipant(participant(atScenarios), 0);
    h.db.response.updateMany.mockResolvedValue({ count: 1 });
    const utilOnly = { scenarioId: answer.scenarioId, utilitarian: answer.utilitarian };
    expect((await json(await postResponses(post(utilOnly)))).body).toEqual({
      ok: true,
      next: "/scenario",
    });
    expect(h.db.response.updateMany.mock.calls[0][0].data).toMatchObject({
      utilitarianChoice: "maintain",
      kantianChoice: null,
    });
  });

  it("last scenario → sets completed_at in the same transaction and returns /debrief", async () => {
    withParticipant(participant(atScenarios), 2);
    h.db.response.count.mockResolvedValueOnce(2).mockResolvedValueOnce(3);
    h.db.response.updateMany.mockResolvedValue({ count: 1 });
    h.db.participant.updateMany.mockResolvedValue({ count: 1 });
    const r = await json(await postResponses(post({ ...answer, scenarioId: "s03" })));
    expect(r.body).toEqual({ ok: true, next: "/debrief" });
    expect(h.db.$transaction).toHaveBeenCalledOnce();
    expect(h.db.participant.updateMany.mock.calls[0][0].where).toEqual({
      id: "p1",
      completedAt: null,
    });
  });

  it("out-of-order scenarioId → 403", async () => {
    withParticipant(participant(atScenarios), 0);
    h.db.response.findUnique.mockResolvedValue(null);
    expect((await postResponses(post({ ...answer, scenarioId: "s03" }))).status).toBe(403);
    expect(h.db.response.updateMany).not.toHaveBeenCalled();
  });

  it("overwriting an earlier answered scenario → 409", async () => {
    withParticipant(participant(atScenarios), 1);
    h.db.response.findUnique.mockResolvedValue({ answeredAt: new Date() });
    const r = await json(await postResponses(post({ ...answer, scenarioId: "s02" })));
    expect(r.body).toMatchObject({ error: "already_answered" });
    expect(r.status).toBe(409);
    expect(h.db.response.updateMany).not.toHaveBeenCalled();
  });

  it("concurrent double submit (0 rows updated, row answered) → 409", async () => {
    withParticipant(participant(atScenarios), 0);
    h.db.response.updateMany.mockResolvedValue({ count: 0 });
    h.db.response.findUnique.mockResolvedValue({ answeredAt: new Date() });
    expect((await postResponses(post(answer))).status).toBe(409);
  });

  it("never served (no row) → 403", async () => {
    withParticipant(participant(atScenarios), 0);
    h.db.response.updateMany.mockResolvedValue({ count: 0 });
    h.db.response.findUnique.mockResolvedValue(null);
    expect((await json(await postResponses(post(answer)))).body).toMatchObject({
      error: "wrong_step",
      next: "/scenario",
    });
  });

  it("own/confidence while their flags are off → 422", async () => {
    withParticipant(participant(atScenarios), 0);
    const r = await json(await postResponses(post({ ...answer, own: "maintain", confidence: 3 })));
    expect(r).toEqual({
      status: 422,
      body: { ok: false, error: "validation", fields: ["own", "confidence"] },
    });
  });

  it("invalid choice → 422", async () => {
    withParticipant(participant(atScenarios), 0);
    expect((await postResponses(post({ ...answer, kantian: "brake" }))).status).toBe(422);
  });
});
