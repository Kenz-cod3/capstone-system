import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import api from "@/services/api";
import { useAuthStore } from "@/store/authStore";

// ✅ BASE URL FIX
const BASE_URL = api.defaults.baseURL?.replace("/api", "") || "";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { logout } = useAuthStore();
  const insets = useSafeAreaInsets();

  // ✅ AUTO REFRESH WHEN SCREEN FOCUSED
  useFocusEffect(
    useCallback(() => {
      fetchUser();
    }, [])
  );

  // ✅ FETCH USER
  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await api.get("/user");
      setUser(res.data);
    } catch (err) {
      console.log("PROFILE ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ LOGOUT
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  // ✅ LOADING
  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color="#0fdf77" />
      </SafeAreaView>
    );
  }

  // ✅ NO USER
  if (!user) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <Text>No user data</Text>
      </SafeAreaView>
    );
  }

  // ✅ SAFE DATA
  const fullName =
    user.name ||
    `${user.first_name || ""} ${user.last_name || ""}`.trim();

  const firstLetter =
    fullName?.charAt(0) ||
    user.first_name?.charAt(0) ||
    "?";

  const role = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "User";

  const headerHeight = 320 + insets.top;

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* 🌿 Gradient Background - matching Home screen */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: headerHeight,
        }}
      >
        <LinearGradient
          colors={["#d1fae5", "#a7f3d0", "#6ee7b7", "#ffffff"]}
          locations={[0, 0.2, 0.4, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1 }}
        />
      </View>

      {/* HEADER with gradient background */}
      <View
        style={{
          paddingTop: insets.top + 40,
          paddingBottom: 24,
        }}
        className="items-center"
      >
        <View style={{ position: "relative" }}>
          {user.profile_image ? (
            <Image
              source={{
                uri: `${BASE_URL}/storage/${user.profile_image}`,
              }}
              className="w-40 h-40 rounded-full border-4 border-white"
            />
          ) : (
            <View className="w-40 h-40 rounded-full bg-teal-500 justify-center items-center border-4 border-white">
              <Text className="text-white text-6xl font-bold">
                {firstLetter}
              </Text>
            </View>
          )}
        </View>

        <View className="mt-4">
          <Text className="text-black text-2xl font-bold text-center">
            {fullName || "No Name"}
          </Text>
        </View>

        <Text className="text-gray-500 text-base mt-1">{role}</Text>
      </View>

      {/* INFO */}
      <View className="m-4 p-5 bg-white rounded-2xl shadow-sm border border-gray-100">
        <Text className="text-gray-700 text-xl font-bold mb-5">
          Personal Information
        </Text>

        <InfoRow icon="mail" text={user.email || "N/A"} />
        <InfoRow icon="call" text={user.contact_number || "N/A"} />
        <InfoRow icon="location" text={user.address || "N/A"} />  
      </View>

      {/* BUTTONS */}
      <View className="flex-row gap-3 px-4 mt-4">
        <TouchableOpacity
          onPress={() => router.push("/profile/edit")}
          className="flex-1 bg-teal-500 p-4 rounded-xl items-center shadow-sm"
        >
          <Text className="text-white font-bold text-base">Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          className="flex-1 border border-red-500 p-4 rounded-xl items-center bg-white"
        >
          <Text className="text-red-500 font-bold text-base">Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ✅ INFO ROW
const InfoRow = ({ icon, text }: any) => (
  <View className="flex-row items-center mb-4">
    <View className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 justify-center items-center mr-3">
      <Ionicons name={icon} size={16} color="#0fdf77" />
    </View>
    <Text className="text-black text-base flex-1">{text}</Text>
  </View>
);