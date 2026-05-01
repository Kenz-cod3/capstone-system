import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  StatusBar,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import api from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import EditProfileModal from "../../profile/edit"; // Import the modal

const BASE_URL = api.defaults.baseURL?.replace("/api", "") || "";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();
  const { logout } = useAuthStore();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      fetchUser();
    }, [refreshKey])
  );

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

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  const handleProfileUpdate = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#faf8f3]">
        <View className="w-16 h-16 rounded-full border border-[#1a4a35]/20 justify-center items-center mb-5">
          <ActivityIndicator size="large" color="#1a4a35" />
        </View>
        <Text
          className="text-[#1a4a35] text-base tracking-widest uppercase"
          style={{ fontFamily: "Georgia" }}
        >
          Loading profile
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 justify-center items-center bg-[#faf8f3]">
        <Text className="text-[#1a4a35]/50" style={{ fontFamily: "Georgia" }}>
          No user data
        </Text>
      </View>
    );
  }

  const fullName =
    user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim();
  const firstLetter = fullName?.charAt(0) || user.first_name?.charAt(0) || "?";
  const role = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "Guest";

  return (
    <>
      <View className="flex-1 bg-[#faf8f3]">
        <StatusBar barStyle="light-content" translucent />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 48 + insets.bottom }}
        >
          {/* ── HERO HEADER ── */}
          <LinearGradient
            colors={["#0d2e1f", "#1a4a35"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingTop: insets.top + 16, paddingBottom: 72, paddingHorizontal: 24 }}
          >
            {/* Decorative circles */}
            <View
              className="absolute rounded-full border border-white/5"
              style={{ width: 260, height: 260, top: -60, right: -60 }}
            />
            <View
              className="absolute rounded-full border border-white/5"
              style={{ width: 160, height: 160, top: -10, right: -10 }}
            />

            {/* Top row */}
            <View className="flex-row justify-between items-center mb-8">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-[#c9a96e]/20 border border-[#c9a96e]/40 justify-center items-center">
                  <Text
                    className="text-[#c9a96e] text-xs font-bold"
                    style={{ fontFamily: "Georgia" }}
                  >
                    L
                  </Text>
                </View>
                <Text className="text-white/50 text-xs tracking-widest uppercase">
                  Inn
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowEditModal(true)} // Open modal instead of navigation
                activeOpacity={0.7}
                className="w-9 h-9 rounded-full bg-white/10 border border-white/10 justify-center items-center"
              >
                <Ionicons name="create-outline" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Eyebrow */}
            <Text className="text-[#c9a96e] text-[10px] tracking-[4px] uppercase mb-2">
              Guest Profile
            </Text>
            <Text
              className="text-white text-3xl mb-1"
              style={{ fontFamily: "Georgia" }}
            >
              {fullName || "No Name"}
            </Text>
            <Text
              className="text-white/40 text-sm"
              style={{ fontFamily: "Georgia", fontStyle: "italic" }}
            >
              {role}
            </Text>
          </LinearGradient>

          {/* ── AVATAR (overlapping hero and content) ── */}
          <View className="items-center" style={{ marginTop: -52 }}>
            {user.profile_image ? (
              <Image
                source={{ uri: `${BASE_URL}/storage/${user.profile_image}` }}
                className="w-28 h-28 rounded-full border-4 border-[#faf8f3]"
              />
            ) : (
              <View
                className="w-28 h-28 rounded-full bg-[#1a4a35] border-4 border-[#faf8f3] justify-center items-center"
              >
                <Text
                  className="text-white text-5xl"
                  style={{ fontFamily: "Georgia" }}
                >
                  {firstLetter}
                </Text>
              </View>
            )}

            {/* Gold ring accent */}
            <View
              className="absolute rounded-full border border-[#c9a96e]/40"
              style={{ width: 120, height: 120 }}
            />
          </View>

          {/* ── PERSONAL INFORMATION ── */}
          <View className="px-6 mt-8">
            <Text className="text-[#1a4a35]/40 text-[10px] tracking-[3px] uppercase mb-4">
              Personal Information
            </Text>

            <View className="bg-white rounded-2xl border border-[#1a4a35]/06 overflow-hidden">
              <InfoRow
                icon="mail-outline"
                label="Email"
                value={user.email || "N/A"}
                isLast={false}
              />
              <InfoRow
                icon="call-outline"
                label="Contact"
                value={user.contact_number || "N/A"}
                isLast={false}
              />
              <InfoRow
                icon="location-outline"
                label="Address"
                value={user.address || "N/A"}
                isLast={true}
              />
            </View>
          </View>

          {/* ── ACCOUNT ── */}
          <View className="px-6 mt-6">
            <Text className="text-[#1a4a35]/40 text-[10px] tracking-[3px] uppercase mb-4">
              Account
            </Text>

            <View className="bg-white rounded-2xl border border-[#1a4a35]/06 overflow-hidden">
              <TouchableOpacity
                onPress={() => setShowEditModal(true)}
                activeOpacity={0.75}
                className="flex-row items-center px-5 py-4 border-b border-[#1a4a35]/06"
              >
                <View className="w-8 h-8 rounded-full bg-[#1a4a35]/06 justify-center items-center mr-4">
                  <Ionicons name="create-outline" size={15} color="#1a4a35" />
                </View>
                <Text className="flex-1 text-[#1a4a35] text-sm">Edit Profile</Text>
                <Ionicons name="chevron-forward" size={15} color="#1a4a35" style={{ opacity: 0.3 }} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowEditModal(true)}
                activeOpacity={0.75}
                className="flex-row items-center px-5 py-4"
              >
                <View className="w-8 h-8 rounded-full bg-[#1a4a35]/06 justify-center items-center mr-4">
                  <Ionicons name="lock-closed-outline" size={15} color="#1a4a35" />
                </View>
                <Text className="flex-1 text-[#1a4a35] text-sm">Change Password</Text>
                <Ionicons name="chevron-forward" size={15} color="#1a4a35" style={{ opacity: 0.3 }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── SIGN OUT ── */}
          <View className="px-6 mt-6">
            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.85}
              className="rounded-2xl overflow-hidden border border-red-200"
            >
              <View className="flex-row items-center justify-center py-4 gap-2 bg-red-50">
                <Ionicons name="log-out-outline" size={18} color="#b91c1c" />
                <Text
                  className="text-red-700 text-sm tracking-widest uppercase"
                  style={{ fontFamily: "Georgia" }}
                >
                  Sign Out
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ── FOOTER ── */}
          <View className="items-center mt-10">
            <View className="flex-row items-center gap-2 mb-2">
              <View className="w-1 h-1 rounded-full bg-[#c9a96e]" />
              <Text
                className="text-[#1a4a35]/30 text-xs tracking-widest uppercase"
                style={{ fontFamily: "Georgia", fontStyle: "italic" }}
              >
                Lyn Enia's Travelers' Inn
              </Text>
              <View className="w-1 h-1 rounded-full bg-[#c9a96e]" />
            </View>
            <Text className="text-[#1a4a35]/20 text-[10px] tracking-wide">
              Version 1.0.0
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdate={handleProfileUpdate}
        user={user}
      />
    </>
  );
}

const InfoRow = ({
  icon,
  label,
  value,
  isLast,
}: {
  icon: string;
  label: string;
  value: string;
  isLast: boolean;
}) => (
  <View
    className={`flex-row items-center px-5 py-4 ${
      !isLast ? "border-b border-[#1a4a35]/06" : ""
    }`}
  >
    <View className="w-8 h-8 rounded-full bg-[#1a4a35]/06 justify-center items-center mr-4">
      <Ionicons name={icon as any} size={15} color="#1a4a35" />
    </View>
    <View className="flex-1">
      <Text className="text-[#1a4a35]/40 text-[10px] tracking-widest uppercase mb-0.5">
        {label}
      </Text>
      <Text className="text-[#1a4a35] text-sm">{value}</Text>
    </View>
  </View>
);