import "server-only";
import { db } from "@/lib/db";
import { getScenarios } from "@/lib/scenarios";
import type { AdminParticipant, AnswerKeys } from "./compute";

/** Loads every participant with their responses, plus the current answer keys and scenario titles. */
export async function loadAdminData(): Promise<{
  participants: AdminParticipant[];
  keys: AnswerKeys;
  titles: Record<string, string>;
}> {
  const participants = await db.participant.findMany({
    include: { responses: { orderBy: { position: "asc" } } },
    orderBy: { id: "asc" },
  });
  // Scenarios without an answerKey are left out, so they aren't scored.
  const keys: AnswerKeys = Object.fromEntries(
    getScenarios().flatMap((s) => (s.answerKey ? [[s.id, s.answerKey]] : [])),
  );
  const titles = Object.fromEntries(getScenarios().map((s) => [s.id, s.title]));
  return { participants, keys, titles };
}
