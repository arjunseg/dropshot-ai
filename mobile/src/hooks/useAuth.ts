import { useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import * as authApi from "@/api/auth";

export function useAuth() {
  const { user, isLoading, isAuthenticated, setUser, setTokens, clearTokens } = useAuthStore();

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authApi.login(email, password);
    await setTokens(tokens.access_token, tokens.refresh_token);
    const me = await authApi.getMe();
    setUser(me);
  }, [setTokens, setUser]);

  const register = useCallback(
    async (email: string, password: string, fullName: string, skillLevel?: number) => {
      const tokens = await authApi.register(email, password, fullName, skillLevel);
      await setTokens(tokens.access_token, tokens.refresh_token);
      const me = await authApi.getMe();
      setUser(me);
    },
    [setTokens, setUser],
  );

  const logout = useCallback(async () => {
    await clearTokens();
  }, [clearTokens]);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch {
      // Token may be invalid — don't crash
    }
  }, [setUser]);

  return { user, isLoading, isAuthenticated, login, register, logout, refreshUser };
}
