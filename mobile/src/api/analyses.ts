import { apiClient } from "./client";
import { Analysis } from "@/types/analysis";

export async function getAnalysis(id: string): Promise<Analysis> {
  const { data } = await apiClient.get<Analysis>(`/analyses/${id}`);
  return data;
}

export async function listAnalyses(
  page = 1,
  pageSize = 20,
  shotType?: string,
): Promise<{ analyses: Analysis[]; total: number }> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  if (shotType) params.shot_type = shotType;
  const { data } = await apiClient.get("/analyses", { params });
  return data;
}

export async function deleteAnalysis(id: string): Promise<void> {
  await apiClient.delete(`/analyses/${id}`);
}
