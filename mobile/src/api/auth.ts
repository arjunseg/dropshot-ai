import { apiClient } from "./client";
import { TokenResponse } from "@/types/api";
import { User } from "@/types/user";

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/login", { email, password });
  return data;
}

export async function register(
  email: string,
  password: string,
  fullName: string,
  skillLevel?: number,
): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/register", {
    email,
    password,
    full_name: fullName,
    skill_level: skillLevel,
  });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>("/users/me");
  return data;
}
