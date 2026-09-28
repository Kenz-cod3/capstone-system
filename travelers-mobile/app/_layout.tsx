// app/_layout.tsx

import "@/global.css";

import { Stack, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { InteractionManager } from "react-native";
import * as Notifications from "expo-notifications";

import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useAuthStore } from "@/store/authStore";

import InactiveScreen from "@/app/inactive";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function Layout() {
  const loadAuth = useAuthStore((s) => s.loadAuth);
  const isLoaded = useAuthStore((s) => s.isLoaded);
  const inactive = useAuthStore((s) => s.inactive);
  const user = useAuthStore((s) => s.user);

  const router = useRouter();

  const hasRedirected = useRef(false);

  /* =========================================================
     LOAD AUTH
  ========================================================= */

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  /* =========================================================
     AUTH REDIRECT
  ========================================================= */

  useEffect(() => {
    if (!isLoaded) return;
    if (inactive) return;

    // Logged out — reset guard, defer nav until transitions settle
    if (!user) {
      hasRedirected.current = false;

      const task = InteractionManager.runAfterInteractions(() => {
        router.replace("/auth/login");
      });

      return () => task.cancel();
    }

    if (hasRedirected.current) return;

    hasRedirected.current = true;

    const task = InteractionManager.runAfterInteractions(() => {
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
    });

    return () => task.cancel();
  }, [isLoaded, user, inactive, router]);

  /* =========================================================
     ROOT LAYOUT
  ========================================================= */

  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
      }}
    >
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />

      {isLoaded && inactive === true && <InactiveScreen />}
    </GestureHandlerRootView>
  );
}