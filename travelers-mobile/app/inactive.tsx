// app/inactive.tsx
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";

export default function InactiveScreen() {
  const { logout } = useAuthStore();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-6">

        {/* TITLE */}
        <Text className="text-2xl font-bold text-red-500 mb-4">
          Account Deactivated
        </Text>

        {/* MESSAGE */}
        <Text className="text-gray-600 text-center mb-6">
          Your account has been disabled by the admin.
          Please contact support for assistance.
        </Text>

        {/* BUTTON */}
        <TouchableOpacity
          onPress={logout}
          className="bg-red-500 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-bold">
            Logout
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}