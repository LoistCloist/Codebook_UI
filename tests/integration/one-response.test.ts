import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, Prisma } from "@/lib/db";
import { ensureParticipant, getCurrentParticipant } from "@/lib/flow/participant";
import { serveCurrentScenario } from "@/lib/flow/scenario";
import { resetRateLimit } from "@/lib/rate-limit";
import {
  COMPREHENSION,
  DEMOGRAPHICS,
  answerFor,
  call,
  counts,
  resetDb,
  routes,
  signInAs,
  startParticipant,
} from "./helpers";

vi.mock("@/lib/auth/session", async () => (await import("./auth-mock")).sessionMock);
vi.mock("@/lib/auth/consent-cookie", async () => (await import("./auth-mock")).consentMock);

// (a) One response per person: the same Google account completes the study, then every
// further write is rejected with 409 and nothing new is written.
describe("one response per Google account", () => {
  beforeEach(resetDb);

  async function completeStudy(sub: string) {
    const participant = await startParticipant(sub);
    const order = participant.scenarioOrder;
    expect(order.length).toBeGreaterThan(0);
    for (const [i, scenarioId] of order.entries()) {
      const served = await serveCurrentScenario(participant.id);
      expect(served).toMatchObject({ id: scenarioId, position: i, total: order.length });
      expect(served).not.toHaveProperty("answerKey");
      const res = await call(routes.responses, answerFor(scenarioId));
      expect(res).toEqual({ status: 200, body: { ok: true, next: i === order.length - 1 ? "/debrief" : "/scenario" } });
    }
    return participant;
  }

  it("completes once; a second attempt at any write returns 409 and adds no rows", async () => {
    const participant = await completeStudy("google-sub-a");

    const done = await db.participant.findUniqueOrThrow({ where: { id: participant.id } });
    expect(done.completedAt).not.toBeNull();
    expect(done.comprehensionPassed).toBe(true);
    const before = await counts();
    expect(before).toEqual({ participants: 1, responses: participant.scenarioOrder.length });
    const answersBefore = await db.response.findMany({ orderBy: { position: "asc" } });

    // Same Google account signs in again (fresh session, fresh consent cookie).
    signInAs("google-sub-a");
    resetRateLimit();
    const again = await ensureParticipant();
    expect(again?.participant.id).toBe(participant.id);
    expect(again?.step).toEqual({ kind: "completed" });

    const attempts = [
      await call(routes.demographics, DEMOGRAPHICS),
      await call(routes.comprehension, COMPREHENSION),
      ...(await Promise.all(participant.scenarioOrder.map((id) => call(routes.responses, answerFor(id))))),
      await call(routes.responses, { ...answerFor(participant.scenarioOrder[0]), utilitarian: "swerve_right" }),
    ];
    for (const res of attempts) {
      expect(res).toEqual({ status: 409, body: { ok: false, error: "study_completed", next: "/completed" } });
    }

    await expect(serveCurrentScenario(participant.id)).rejects.toThrow(/not on a scenario step/);
    expect(await counts()).toEqual(before);
    expect(await db.response.findMany({ orderBy: { position: "asc" } })).toEqual(answersBefore);
  });

  it("the database itself refuses a second participant row for the same hash", async () => {
    const hash = signInAs("google-sub-a");
    await ensureParticipant();
    const err = await db.participant
      .create({ data: { participantHash: hash, consentedAt: new Date(), startedAt: new Date(), scenarioOrder: [] } })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect((err as Prisma.PrismaClientKnownRequestError).code).toBe("P2002");
    expect((await counts()).participants).toBe(1);
  });

  it("a different Google account gets its own participant", async () => {
    await completeStudy("google-sub-a");
    signInAs("google-sub-b");
    const other = await ensureParticipant();
    expect(other?.step).toEqual({ kind: "demographics" });
    expect((await counts()).participants).toBe(2);
    expect((await getCurrentParticipant())?.participant.id).toBe(other?.participant.id);
  });
});
