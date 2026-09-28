import "server-only";

// Contract stub (Agent 0). Owner: Agent 5 — replace the body, keep the signature.
// DashboardStats is a suggested shape; Agent 5 may refine it (it is not a §4 signature).

export type DashboardStats = {
  started: number;
  completed: number;
  inProgress: number;
  comprehensionFailures: number;
  duplicateGroups: { groupId: string; participantIds: string[] }[];
  straightLiners: string[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  throw new Error("NOT_IMPLEMENTED: owned by Agent 5");
}
