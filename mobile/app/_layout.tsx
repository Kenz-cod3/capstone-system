// app/_layout.tsx
import "@/global.css";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useAuthStore } from "@/store/authStore";
import InactiveScreen from "@/app/inactive";

export default function Layout() {
  const loadAuth = useAuthStore((s) => s.loadAuth);
  const isLoaded = useAuthStore((s) => s.isLoaded);
  const inactive = useAuthStore((s) => s.inactive);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    loadAuth();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user && !inactive) {
      router.replace("/auth/login");
      return;
    }

    if (user && !inactive) {
      switch (user.role) {
        case "guest":
          router.replace("/(guest)/(tabs)/home");
          break;
        case "housekeeper":
          router.replace("/(housekeeper)/(tabs)/dashboard");
          break;
        default:
          router.replace("/auth/login");
          break;
      }
    }
  }, [user, inactive, isLoaded]);

  if (!isLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {inactive === true ? (
        <InactiveScreen />
      ) : (
        <Stack screenOptions={{ headerShown: false }} />
      )}
    </GestureHandlerRootView>
  );
}