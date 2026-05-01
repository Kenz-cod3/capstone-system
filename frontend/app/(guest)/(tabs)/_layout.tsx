import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import api from "@/services/api";
import { View, Text, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

export default function TabsLayout() {
  const { user, isLoaded, setInactive } = useAuthStore();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  const checkUserStatus = async () => {
    try {
      const res = await api.get("/user");

      console.log("CHECK STATUS:", res.data.is_active);

      if (!res.data.is_active) {
        console.log("🚫 User inactive");
        setInactive(true);
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setInactive(true);
      }
    } finally {
      setChecked(true);
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkUserStatus();
    }, [])
  );

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    checkUserStatus();

    const interval = setInterval(() => {
      checkUserStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [user, isLoaded]);

  // Elegant loading screen matching home theme
  if (!isLoaded || !checked) {
    return (
      <View className="flex-1 justify-center items-center bg-[#faf8f3]">
        <LinearGradient
          colors={["#0d2e1f", "#1a4a35", "#0d2e1f"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        
        {/* Decorative elements */}
        <View
          className="absolute rounded-full border border-white/5"
          style={{ width: 320, height: 320, top: -80, right: -80 }}
        />
        <View
          className="absolute rounded-full border border-white/5"
          style={{ width: 200, height: 200, bottom: -60, left: -60 }}
        />
        <View
          className="absolute rounded-full border border-white/5"
          style={{ width: 150, height: 150, top: "40%", right: -30 }}
        />

        <View className="items-center">
          <View className="w-20 h-20 rounded-full border border-[#c9a96e]/30 justify-center items-center mb-6 bg-white/5">
            <ActivityIndicator size="large" color="#c9a96e" />
          </View>
          <Text
            className="text-[#c9a96e] text-lg tracking-[4px] uppercase mb-2"
            style={{ fontFamily: "Georgia" }}
          >
            Lyn Enia's
          </Text>
          <Text
            className="text-white/60 text-sm tracking-widest"
            style={{ fontFamily: "Georgia", fontStyle: "italic" }}
          >
            Travelers' Inn
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e8e4d9",
          height: 80,
          paddingBottom: 12,
          paddingTop: 10,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -2 },
          elevation: 6,
        },
        tabBarActiveTintColor: "#c9a96e",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.5,
        },
        tabBarItemStyle: {
          gap: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center">
              {focused && (
                <View className="absolute -top-2 w-1 h-1 rounded-full bg-[#c9a96e]" />
              )}
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center">
              {focused && (
                <View className="absolute -top-2 w-1 h-1 rounded-full bg-[#c9a96e]" />
              )}
              <Ionicons
                name={focused ? "calendar" : "calendar-outline"}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center">
              {focused && (
                <View className="absolute -top-2 w-1 h-1 rounded-full bg-[#c9a96e]" />
              )}
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />

      {/* Optional: Add a Chat tab if needed */}
      {/* <Tabs.Screen
        name="chat"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center">
              {focused && (
                <View className="absolute -top-2 w-1 h-1 rounded-full bg-[#c9a96e]" />
              )}
              <Ionicons
                name={focused ? "chatbubble" : "chatbubble-outline"}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      /> */}
    </Tabs>
  );
}