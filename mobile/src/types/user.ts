export interface User {
  id: string;
  email: string;
  full_name: string;
  skill_level: number | null;
  expo_push_token: string | null;
}

export interface Subscription {
  id: string;
  plan: "free" | "pro" | "coach";
  status: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
  is_pro: boolean;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface UsageStats {
  analyses_this_month: number;
  monthly_limit: number;
  is_pro: boolean;
  remaining: number;
}
