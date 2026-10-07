import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeKnownError, makeDb } from "./mocks";
import { atPrimer, atScenarios, participant } from "./fixtures";

const h = vi.hoisted(() => ({ db: undefined as unknown as ReturnType<typeof import("./mocks").makeDb> }));
const session = vi.hoisted(() => ({ getParticipantHash: vi.fn() }));
const consent = vi.hoisted(() => ({ readConsentIntent: vi.fn() }));

vi.mock("@/lib/auth/session", () => session);
vi.mock("@/lib/auth/consent-cookie", () => consent);
vi.mock("@/lib/db", () => ({
  get db() {
    return h.db;
  },
  Prisma: { PrismaClientKnownRequestError: FakeKnownError },
}));
vi.mock("@/lib/scenarios", () => {
  const list = ["s01", "s02", "s03"].map((id) => ({
    id,
    title: `T ${id}`,
    text: `Text ${id}`,
    answerKey: { utilitarian: ["maintain"], kantian: ["maintain"] },
  }));
  return {
    getScenarios: () => list,
    getScenario: (id: string) => list.find((s) => s.id === id),
    toPublicScenario: (s: (typeof list)[number]) => ({ id: s.id, title: s.title, text: s.text }),
  };
});

import { ensureParticipant, getCurrentParticipant } from "@/lib/flow/participant";
import { serveCurrentScenario } from "@/lib/flow/scenario";

beforeEach(() => {
  h.db = makeDb();
  session.getParticipantHash.mockReset().mockResolvedValue("hash-1");
  consent.readConsentIntent.mockReset().mockResolvedValue(true);
  h.db.response.count.mockResolvedValue(0);
});

describe("getCurrentParticipant", () => {
  it("null when signed out or no row", async () => {
    session.getParticipantHash.mockResolvedValueOnce(null);
    expect(await getCurrentParticipant()).toBeNull();
    h.db.participant.findUnique.mockResolvedValue(null);
    expect(await getCurrentParticipant()).toBeNull();
  });

  it("returns the participant and step from the answered count", async () => {
    const p = participant(atScenarios);
    h.db.participant.findUnique.mockResolvedValue(p);
    h.db.response.count.mockResolvedValue(1);
    expect(await getCurrentParticipant()).toEqual({
      participant: p,
      step: { kind: "scenario", scenarioId: "s01", position: 1, total: 3 },
    });
    expect(h.db.response.count).toHaveBeenCalledWith({ where: { participantId: "p1", answeredAt: { not: null } } });
  });
});

describe("ensureParticipant", () => {
  it("null when signed out", async () => {
    session.getParticipantHash.mockResolvedValue(null);
    expect(await ensureParticipant()).toBeNull();
  });

  it("returns an existing participant without creating or reading consent", async () => {
    h.db.participant.findUnique.mockResolvedValue(participant(atPrimer));
    expect((await ensureParticipant())?.step).toEqual({ kind: "primer" });
    expect(h.db.participant.create).not.toHaveBeenCalled();
    expect(consent.readConsentIntent).not.toHaveBeenCalled();
  });

  it("no row and no consent → null, nothing created", async () => {
    h.db.participant.findUnique.mockResolvedValue(null);
    consent.readConsentIntent.mockResolvedValue(false);
    expect(await ensureParticipant()).toBeNull();
    expect(h.db.participant.create).not.toHaveBeenCalled();
  });

  it("creates the row once with timestamps and a shuffled order of all scenarios", async () => {
    const created = participant();
    h.db.participant.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(created);
    const r = await ensureParticipant();
    expect(r).toEqual({ participant: created, step: { kind: "primer" } });
    const data = h.db.participant.create.mock.calls[0][0].data;
    expect(data.participantHash).toBe("hash-1");
    expect(data.consentedAt).toBeInstanceOf(Date);
    expect(data.startedAt).toBe(data.consentedAt);
    expect([...data.scenarioOrder].sort()).toEqual(["s01", "s02", "s03"]);
  });

  it("concurrent create (unique violation) → uses the existing row", async () => {
    const existing = participant();
    h.db.participant.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
    h.db.participant.create.mockRejectedValue(new FakeKnownError("P2002"));
    expect((await ensureParticipant())?.participant).toBe(existing);
  });

  it("other create errors propagate", async () => {
    h.db.participant.findUnique.mockResolvedValue(null);
    h.db.participant.create.mockRejectedValue(new Error("db down"));
    await expect(ensureParticipant()).rejects.toThrow("db down");
  });
});

describe("serveCurrentScenario", () => {
  const row = (o: object = {}) => ({ id: "r1", position: 0, questionOrder: "K_first", answeredAt: null, ...o });

  it("first render creates the row with first_served_at = served_at and a random order", async () => {
    h.db.participant.findUnique.mockResolvedValue(participant(atScenarios));
    h.db.response.findUnique.mockResolvedValue(null);
    h.db.response.create.mockImplementation(async ({ data }) => ({ id: "r1", ...data, answeredAt: null }));
    const s = await serveCurrentScenario("p1");
    const data = h.db.response.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ participantId: "p1", scenarioId: "s02", position: 0 });
    expect(data.firstServedAt).toBe(data.servedAt);
    expect(["U_first", "K_first"]).toContain(data.questionOrder);
    expect(s).toEqual({
      id: "s02",
      title: "T s02",
      text: "Text s02",
      position: 0,
      total: 3,
      questionOrder: data.questionOrder,
      askOwnChoice: false,
      askConfidence: false,
    });
    expect(s).not.toHaveProperty("answerKey");
    expect(h.db.response.updateMany).not.toHaveBeenCalled();
  });

  it("re-render keeps the stored question order and only refreshes served_at", async () => {
    h.db.participant.findUnique.mockResolvedValue(participant(atScenarios));
    h.db.response.findUnique.mockResolvedValue(row());
    const s = await serveCurrentScenario("p1");
    expect(s.questionOrder).toBe("K_first");
    expect(h.db.response.create).not.toHaveBeenCalled();
    const call = h.db.response.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: "r1", answeredAt: null });
    expect(Object.keys(call.data)).toEqual(["servedAt"]);
  });

  it("concurrent first render (unique violation) falls back to the existing row", async () => {
    h.db.participant.findUnique.mockResolvedValue(participant(atScenarios));
    h.db.response.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(row({ questionOrder: "U_first" }));
    h.db.response.create.mockRejectedValue(new FakeKnownError("P2002"));
    expect((await serveCurrentScenario("p1")).questionOrder).toBe("U_first");
  });

  it("throws when the participant isn't on a scenario step", async () => {
    h.db.participant.findUnique.mockResolvedValue(participant(atPrimer));
    await expect(serveCurrentScenario("p1")).rejects.toThrow(/not on a scenario step/);
  });

  it("throws loudly when the stored order references a missing scenario", async () => {
    h.db.participant.findUnique.mockResolvedValue(participant({ ...atScenarios, scenarioOrder: ["gone", "s01"] }));
    await expect(serveCurrentScenario("p1")).rejects.toThrow(/"gone".*missing from data\/scenarios.json/);
    expect(h.db.response.create).not.toHaveBeenCalled();
  });
});
