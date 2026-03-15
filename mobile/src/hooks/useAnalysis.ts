import { useQuery } from "@tanstack/react-query";
import { getAnalysis } from "@/api/analyses";
import { PROCESSING_STATUSES } from "@/types/analysis";

export function useAnalysis(id: string) {
  return useQuery({
    queryKey: ["analysis", id],
    queryFn: () => getAnalysis(id),
    // Poll every 3 seconds while processing, stop when complete or failed
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return 3000;
      if (PROCESSING_STATUSES.includes(status as any)) return 3000;
      return false; // Stop polling
    },
    staleTime: 0,
    enabled: !!id,
  });
}

export function useAnalysisList(page = 1, shotType?: string) {
  return useQuery({
    queryKey: ["analyses", page, shotType],
    queryFn: () => {
      const { listAnalyses } = require("@/api/analyses");
      return listAnalyses(page, 20, shotType);
    },
    staleTime: 60_000,
  });
}
