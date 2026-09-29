import "server-only";
import { PARTICIPANTS_HEADER, RESPONSES_HEADER, participantRows, responseRows } from "./compute";
import { toCsv } from "./csv";
import { loadAdminData } from "./data";

/** One row per response (including served-but-unanswered ones). Uses the internal id, never the hash. */
export async function buildResponsesCsv(): Promise<string> {
  const { participants, keys } = await loadAdminData();
  return toCsv(RESPONSES_HEADER, responseRows(participants, keys));
}

/** One row per participant. Uses the internal id, never the hash. */
export async function buildParticipantsCsv(): Promise<string> {
  const { participants, keys } = await loadAdminData();
  return toCsv(PARTICIPANTS_HEADER, participantRows(participants, keys));
}
