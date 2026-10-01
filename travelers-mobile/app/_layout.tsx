// app/_layout.tsx

import "@/global.css";

import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { InteractionManager, BackHandler, Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useAuthStore } from "@/store/authStore";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Routes where back button should always go straight to index
const AUTH_ROOTS = ["auth"];

export default function Layout() {
  const loadAuth = useAuthStore((s) => s.loadAuth);
  const isLoaded = useAuthStore((s) => s.isLoaded);
  const inactive = useAuthStore((s) => s.inactive);
  const user = useAuthStore((s) => s.user);

  const router = useRouter();
  const segments = useSegments();

  const hasRedirected = useRef(false);
  const wasInactive = useRef(false);

  /* LOAD AUTH */
  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  /* ANDROID HARDWARE BACK — override when on auth routes and not logged in */
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const onBackPress = () => {
      const root = segments[0] as string | undefined;

      // If we're inside the auth stack (login / register / otp / etc.)
      // and the user is not logged in → force go to index instead of going
      // back in history.
      if (root && AUTH_ROOTS.includes(root) && !user) {
        router.replace("/");
        return true; // prevent default back behavior
      }

      return false; // let default behavior happen
    };

    const sub = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );

    return () => sub.remove();
  }, [segments, user, router]);

  /* AUTH + INACTIVE REDIRECT */
  useEffect(() => {
    if (!isLoaded) return;

    const root = segments[0] as string | undefined;
    const currentSeg1 = segments[1] as string | undefined;
    const onInactiveRoute =
      root === "inactive" ||
      (root === "auth" && currentSeg1 === "inactive");

    // ============================================
    // CASE 1: Account became inactive → go to /inactive
    // ============================================
    if (inactive) {
      wasInactive.current = true;

      if (!onInactiveRoute) {
        const task = InteractionManager.runAfterInteractions(() => {
          router.replace("/inactive");
        });
        return () => task.cancel();
      }
      return;
    }

    // ============================================
    // CASE 2: Account just got re-activated → leave /inactive
    // ============================================
    if (wasInactive.current && !inactive) {
      wasInactive.current = false;
      if (onInactiveRoute) {
        const task = InteractionManager.runAfterInteractions(() => {
          if (user?.role === "guest") {
            router.replace("/(guest)/(tabs)/home");
          } else if (user?.role === "housekeeper") {
            router.replace("/(housekeeper)/(tabs)/dashboard");
          } else {
            router.replace("/");
          }
        });
        return () => task.cancel();
      }
    }

    // ============================================
    // CASE 3: Logged out
    // ============================================
    if (!user) {
      hasRedirected.current = false;

      const inProtectedArea = root === "(guest)" || root === "(housekeeper)";
      if (!inProtectedArea) return;

      const task = InteractionManager.runAfterInteractions(() => {
        router.replace("/");
      });
      return () => task.cancel();
    }

    // ============================================
    // CASE 4: Logged in → role-based home (once)
    // ============================================
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
          router.replace("/");
          break;
      }
    });

    return () => task.cancel();
  }, [isLoaded, user, inactive, router, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}