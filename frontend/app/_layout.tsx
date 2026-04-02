import "@/global.css";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

export default function Layout() {
  const loadAuth = useAuthStore((s) => s.loadAuth);
  const isLoaded = useAuthStore((s) => s.isLoaded);

  useEffect(() => {
    loadAuth();
  }, []);

  if (!isLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}