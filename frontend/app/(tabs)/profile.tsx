import { View, Text, TouchableOpacity } from "react-native";
import { useAuthStore } from "../../store/authStore";
import { useRouter } from "expo-router";

export default function Profile() {
  const { logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();

    router.replace("/auth/login");
  };

  return (
    <View className="flex-1 justify-center items-center">
      <Text className="text-lg mb-4">Profile</Text>

      <TouchableOpacity
        onPress={handleLogout}
        className="bg-red-500 px-6 py-3 rounded-xl"
      >
        <Text className="text-white font-bold">Logout</Text>
      </TouchableOpacity>
    </View>
  );
}