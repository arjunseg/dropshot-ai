import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/store/authStore";
import { getMe } from "@/api/auth";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60_000,
    },
  },
});

export default function RootLayout() {
  const { hydrate, setUser, setLoading } = useAuthStore();

  const [fontsLoaded] = useFonts({
    // Inter is available via system fonts on iOS/Android 14+
    // Add custom font files here if needed
  });

  useEffect(() => {
    async function init() {
      const hasTokens = await hydrate();
      if (hasTokens) {
        try {
          const user = await getMe();
          setUser(user);
        } catch {
          // Token expired or invalid — user will be redirected to auth
        }
      }
      if (fontsLoaded) {
        SplashScreen.hideAsync();
      }
    }
    init();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0A0E1A" },
          headerTintColor: "#F0F4FF",
          contentStyle: { backgroundColor: "#0A0E1A" },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="analysis/[id]"
          options={{ title: "Analysis", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="analysis/processing"
          options={{ title: "Analyzing...", gestureEnabled: false }}
        />
        <Stack.Screen
          name="subscription/paywall"
          options={{ title: "Upgrade to Pro", presentation: "modal" }}
        />
        <Stack.Screen
          name="subscription/checkout"
          options={{ title: "Subscribe", presentation: "modal" }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
