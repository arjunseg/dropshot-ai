import { useQuery } from "@tanstack/react-query";
import { getSubscription, getUsageStats } from "@/api/subscription";

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: getSubscription,
    staleTime: 5 * 60_000, // 5 minutes
  });
}

export function useUsageStats() {
  return useQuery({
    queryKey: ["usage"],
    queryFn: getUsageStats,
    staleTime: 60_000,
  });
}
