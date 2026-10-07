import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { ensureParticipant, getCurrentParticipant } from "@/lib/flow/participant";
import { serveCurrentScenario } from "@/lib/flow/scenario";
import { answerFor, call, counts, resetDb, routes, signInAs, signOut, startParticipant } from "./helpers";

vi.mock("@/lib/auth/session", async () => (await import("./auth-mock")).sessionMock);
vi.mock("@/lib/auth/consent-cookie", async () => (await import("./auth-mock")).consentMock);

// (b) An interrupted session resumes at the right scenario, with the stored order unchanged,
// and an answered scenario can't be overwritten.
describe("resume where left off", () => {
  beforeEach(resetDb);

  it("after answering 1 of N, a returning participant resumes at scenario 2 of the stored order", async () => {
    const participant = await startParticipant("google-sub-resume");
    const order = [...participant.scenarioOrder];
    expect(order.length).toBeGreaterThanOrEqual(2); // needs at least two scenarios

    const first = await serveCurrentScenario(participant.id);
    expect(first).toMatchObject({ id: order[0], position: 0 });
    expect(await call(routes.responses, answerFor(order[0]))).toMatchObject({ status: 200, body: { next: "/scenario" } });
    const answered = await db.response.findUniqueOrThrow({
      where: { participantId_scenarioId: { participantId: participant.id, scenarioId: order[0] } },
    });

    // The session ends; later the same Google account signs in again.
    signOut();
    expect(await getCurrentParticipant()).toBeNull();
    signInAs("google-sub-resume");

    const back = await ensureParticipant();
    expect(back?.participant.id).toBe(participant.id);
    expect(back?.participant.scenarioOrder).toEqual(order); // never reshuffled
    expect(back?.step).toEqual({ kind: "scenario", scenarioId: order[1], position: 1, total: order.length });

    const second = await serveCurrentScenario(participant.id);
    expect(second).toMatchObject({ id: order[1], position: 1, total: order.length });
    const secondRow = await db.response.findUniqueOrThrow({
      where: { participantId_scenarioId: { participantId: participant.id, scenarioId: order[1] } },
    });
    // A re-render keeps the question order and first_served_at; only served_at moves.
    await serveCurrentScenario(participant.id);
    const secondAgain = await db.response.findUniqueOrThrow({ where: { id: secondRow.id } });
    expect(secondAgain.questionOrder).toBe(secondRow.questionOrder);
    expect(secondAgain.firstServedAt).toEqual(secondRow.firstServedAt);
    expect(secondAgain.servedAt.getTime()).toBeGreaterThanOrEqual(secondRow.servedAt.getTime());

    // Overwriting scenario 1 is rejected and leaves the saved answer as it was.
    const overwrite = await call(routes.responses, { ...answerFor(order[0]), utilitarian: "swerve_right", kantian: "maintain" });
    expect(overwrite).toEqual({ status: 409, body: { ok: false, error: "already_answered", next: "/scenario" } });
    expect(await db.response.findUniqueOrThrow({ where: { id: answered.id } })).toEqual(answered);

    // The stored order is still unchanged and nothing extra was written.
    expect((await db.participant.findUniqueOrThrow({ where: { id: participant.id } })).scenarioOrder).toEqual(order);
    expect(await counts()).toEqual({ participants: 1, responses: 2 });
  });

  it("a participant who stopped before the primer resumes at the primer with the same order", async () => {
    signInAs("google-sub-early");
    const created = await ensureParticipant();
    expect(created?.step).toEqual({ kind: "primer" });
    signOut();
    signInAs("google-sub-early");
    const back = await ensureParticipant();
    expect(back?.participant.id).toBe(created?.participant.id);
    expect(back?.participant.scenarioOrder).toEqual(created?.participant.scenarioOrder);
    expect(back?.step).toEqual({ kind: "primer" });
  });
});
