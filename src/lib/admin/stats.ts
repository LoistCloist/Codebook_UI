import "server-only";
import { computeStats, type DashboardStats } from "./compute";
import { loadAdminData } from "./data";

export type { DashboardStats };

export async function getDashboardStats(): Promise<DashboardStats> {
  const { participants, keys } = await loadAdminData();
  return computeStats(participants, keys);
}
