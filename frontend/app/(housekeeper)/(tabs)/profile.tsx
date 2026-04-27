import { View, Text, TouchableOpacity, Alert, Image, ScrollView } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';

export default function Profile() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  // LOGOUT WITH CONFIRM + REDIRECT
  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/auth/login");
          },
        },
      ]
    );
  };

  // Get user display name
  const displayName = user?.name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "User";
  const userEmail = user?.email || "No Email";
  const userRole = user?.role || "N/A";
  const userAvatar = user?.avatar || null;

  // Get role color and icon
  const getRoleInfo = (role: string) => {
    switch (role.toLowerCase()) {
      case 'guest':
        return { color: '#10b981', bgColor: '#d1fae5', icon: 'person-outline' };
      case 'housekeeper':
        return { color: '#3b82f6', bgColor: '#dbeafe', icon: 'briefcase-outline' };
      default:
        return { color: '#6b7280', bgColor: '#f3f4f6', icon: 'person-outline' };
    }
  };

  const roleInfo = getRoleInfo(userRole);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* HEADER SECTION WITH GRADIENT */}
      <LinearGradient
        colors={['#10b981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 60, paddingBottom: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
      >
        <View className="items-center">
          {/* AVATAR */}
          <View className="relative">
            <View className="w-28 h-28 rounded-full bg-white/20 items-center justify-center border-4 border-white shadow-lg">
              {userAvatar ? (
                <Image
                  source={{ uri: userAvatar }}
                  className="w-full h-full rounded-full"
                />
              ) : (
                <Text className="text-4xl font-bold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <TouchableOpacity
              className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md"
              onPress={() => Alert.alert("Coming Soon", "Edit profile feature coming soon!")}
            >
              <Feather name="edit-2" size={16} color="#059669" />
            </TouchableOpacity>
          </View>

          {/* USER NAME */}
          <Text className="text-white text-2xl font-bold mt-4">
            {displayName}
          </Text>

          {/* ROLE BADGE */}
          <View
            className="flex-row items-center mt-2 px-4 py-1 rounded-full"
            style={{ backgroundColor: roleInfo.bgColor }}
          >
            <Ionicons name={roleInfo.icon as any} size={16} color={roleInfo.color} />
            <Text className="ml-1 font-semibold" style={{ color: roleInfo.color }}>
              {userRole.toUpperCase()}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* PROFILE INFO CARDS */}
      <View className="px-6 -mt-6">
        {/* CONTACT INFORMATION CARD */}
        <View className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <View className="flex-row items-center mb-4">
            <View className="bg-green-100 p-2 rounded-full mr-3">
              <Ionicons name="information-circle" size={24} color="#10b981" />
            </View>
            <Text className="text-lg font-bold text-gray-800">
              Contact Information
            </Text>
          </View>

          {/* EMAIL */}
          <View className="flex-row items-center py-3 border-b border-gray-100">
            <View className="bg-gray-100 p-2 rounded-full mr-3">
              <MaterialIcons name="email" size={20} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500">Email Address</Text>
              <Text className="text-gray-800 font-medium">{userEmail}</Text>
            </View>
            <TouchableOpacity>
              <Feather name="copy" size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* MEMBER SINCE */}
          <View className="flex-row items-center pt-3">
            <View className="bg-gray-100 p-2 rounded-full mr-3">
              <Ionicons name="calendar" size={20} color="#6b7280" />
            </View>
            <View>
              <Text className="text-xs text-gray-500">Member Since</Text>
              <Text className="text-gray-800 font-medium">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                  : "N/A"}
              </Text>
            </View>
          </View>
        </View>

        {/* ACCOUNT SETTINGS CARD */}
        <View className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <View className="flex-row items-center mb-4">
            <View className="bg-green-100 p-2 rounded-full mr-3">
              <Ionicons name="settings" size={24} color="#10b981" />
            </View>
            <Text className="text-lg font-bold text-gray-800">
              Account Settings
            </Text>
          </View>

          {/* SETTINGS OPTIONS */}
          <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
            <View className="bg-gray-100 p-2 rounded-full mr-3">
              <Ionicons name="lock-closed" size={20} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-800 font-medium">Change Password</Text>
              <Text className="text-xs text-gray-500">Update your password</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
            <View className="bg-gray-100 p-2 rounded-full mr-3">
              <Ionicons name="notifications" size={20} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-800 font-medium">Notifications</Text>
              <Text className="text-xs text-gray-500">Manage your alerts</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center py-3">
            <View className="bg-gray-100 p-2 rounded-full mr-3">
              <Ionicons name="shield-checkmark" size={20} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-800 font-medium">Privacy & Security</Text>
              <Text className="text-xs text-gray-500">Control your data</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* SUPPORT CARD */}
        <View className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <View className="flex-row items-center mb-4">
            <View className="bg-green-100 p-2 rounded-full mr-3">
              <Ionicons name="help-circle" size={24} color="#10b981" />
            </View>
            <Text className="text-lg font-bold text-gray-800">
              Support & Help
            </Text>
          </View>

          <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
            <View className="bg-gray-100 p-2 rounded-full mr-3">
              <Ionicons name="chatbubbles" size={20} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-800 font-medium">Contact Support</Text>
              <Text className="text-xs text-gray-500">Get help from our team</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center py-3">
            <View className="bg-gray-100 p-2 rounded-full mr-3">
              <Ionicons name="document-text" size={20} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-800 font-medium">Terms & Conditions</Text>
              <Text className="text-xs text-gray-500">Read our policies</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-500 rounded-2xl p-4 mb-8 shadow-lg"
          activeOpacity={0.9}
        >
          <View className="flex-row items-center justify-center">
            <MaterialIcons name="logout" size={24} color="white" />
            <Text className="text-white text-center font-bold text-lg ml-2">
              Logout
            </Text>
          </View>
        </TouchableOpacity>

        {/* VERSION INFO */}
        <Text className="text-center text-gray-400 text-xs mb-6">
          Version 1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}