import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { User } from "@/types/user";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  clearTokens: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  hydrate: () => Promise<boolean>; // Returns true if tokens exist
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setTokens: async (accessToken, refreshToken) => {
    await SecureStore.setItemAsync("access_token", accessToken);
    await SecureStore.setItemAsync("refresh_token", refreshToken);
    set({ isAuthenticated: true });
  },

  clearTokens: async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    set({ user: null, isAuthenticated: false });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  hydrate: async () => {
    const token = await SecureStore.getItemAsync("access_token");
    set({ isLoading: false });
    return !!token;
  },
}));
