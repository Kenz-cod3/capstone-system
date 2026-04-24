import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import api from "@/services/api";

export default function TabsLayout() {
  const { user, isLoaded, setInactive } = useAuthStore();
  const router = useRouter();

  const [checked, setChecked] = useState(false); // 🔥 prevent flicker

  // 🔥 CHECK USER STATUS
  const checkUserStatus = async () => {
    try {
      const res = await api.get("/user");

      console.log("CHECK STATUS:", res.data.is_active);

      if (!res.data.is_active) {
        console.log("🚫 User inactive");

        setInactive(true); // 🔥 trigger inactive screen
      }

    } catch (err: any) {
      if (err.response?.status === 403) {
        setInactive(true);
      }
    } finally {
      setChecked(true); // ✅ mark checked
    }
  };

  // 🔥 RUN ON SCREEN FOCUS (INSTANT CHECK)
  useFocusEffect(
    useCallback(() => {
      checkUserStatus();
    }, [])
  );

  // 🔥 MAIN EFFECT
  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    // 🔥 FIRST CHECK
    checkUserStatus();

    // 🔥 AUTO CHECK EVERY 2 SECONDS
    const interval = setInterval(() => {
      checkUserStatus();
    }, 2000);

    return () => clearInterval(interval);

  }, [user, isLoaded]);

  // 🔥 BLOCK UI UNTIL CHECKED (NO HOME FLASH)
  if (!isLoaded || !checked) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,

        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          height: 80,
          paddingBottom: 10,
          paddingTop: 10,
        },

        tabBarActiveTintColor: "#22c55e",
        tabBarInactiveTintColor: "#9ca3af",

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
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
