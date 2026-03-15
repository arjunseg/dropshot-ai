import { apiClient } from "./client";
import { Subscription, UsageStats } from "@/types/user";

export async function getSubscription(): Promise<Subscription> {
  const { data } = await apiClient.get<Subscription>("/subscription");
  return data;
}

export async function getUsageStats(): Promise<UsageStats> {
  const { data } = await apiClient.get<UsageStats>("/subscription/usage");
  return data;
}

export async function createCheckoutSession(
  priceId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<{ checkout_url: string; session_id: string }> {
  const { data } = await apiClient.post("/subscription/checkout", {
    price_id: priceId,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  return data;
}

export async function createPortalSession(
  returnUrl: string,
): Promise<{ portal_url: string }> {
  const { data } = await apiClient.post("/subscription/portal", { return_url: returnUrl });
  return data;
}
