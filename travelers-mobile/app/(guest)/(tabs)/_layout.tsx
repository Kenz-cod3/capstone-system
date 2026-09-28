import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { connectRealtime } from "@/services/realtime";

export default function TabsLayout() {
  const { user, isLoaded, setInactive } = useAuthStore();
  const router = useRouter();
  const disconnectRef = useRef<(() => void) | null>(null);
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user) return;

    disconnectRef.current?.();
    disconnectRef.current = null;

    console.log("📡 Connecting via WebSocket...");

    disconnectRef.current = connectRealtime(
      user.id,
      async () => {
        await setInactive(true);
      },
      async () => {
        await setInactive(false);
      }
    );

    return () => {
      disconnectRef.current?.();
      disconnectRef.current = null;
    };
  }, [isLoaded, user]);

  // 👇 Fix: Only navigate once and only after isLoaded is complete
  useEffect(() => {
    if (!isLoaded) return;
    
    // Only navigate if there's no user and we haven't navigated yet
    if (!user && !hasNavigated.current) {
      hasNavigated.current = true;
      router.replace("/auth/login");
    }
    
    // Reset flag if user becomes available again
    if (user) {
      hasNavigated.current = false;
    }
  }, [user, isLoaded, router]);

  if (!isLoaded) {
    return (
      <View className="flex-1 justify-center items-center bg-[#0d2e1f]">
        <LinearGradient
          colors={["#0d2e1f", "#1a4a35", "#0d2e1f"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <ActivityIndicator size="large" color="#c9a96e" />
      </View>
    );
  }

  // Optional: Show loading if user is null but we shouldn't navigate yet
  if (!user) {
    return (
      <View className="flex-1 justify-center items-center bg-[#0d2e1f]">
        <LinearGradient
          colors={["#0d2e1f", "#1a4a35", "#0d2e1f"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <ActivityIndicator size="large" color="#c9a96e" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#fff", height: 70 },
        tabBarActiveTintColor: "#c9a96e",
        tabBarInactiveTintColor: "#9ca3af",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}