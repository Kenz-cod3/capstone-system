import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  Dimensions,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { getRooms } from "@/services/roomService";
import { useAuthStore } from "@/store/authStore";

const { height } = Dimensions.get("window");

export default function Welcome() {
  const router = useRouter();
  const { user, isLoaded } = useAuthStore();

  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 AUTO REDIRECT IF LOGGED IN
  useEffect(() => {
    if (!isLoaded) return;

    if (user) {
      router.replace("/(tabs)/home");
    }
  }, [user, isLoaded]);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await getRooms();
      setRooms(res?.data || res);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">

      <ImageBackground
        source={require("../assets/bg.jpg")}
        style={{ height: height * 0.55 }}
        resizeMode="cover"
      >
        <View className="absolute inset-0 bg-green-900/60" />

        <View className="flex-1 justify-center items-center px-6">

          <Image
            source={require("../assets/logo.jpg")}
            style={{
              width: height * 0.12,
              height: height * 0.12,
            }}
            className="mb-4 rounded-full border-4 border-white"
          />

          <Text className="text-white text-2xl font-bold text-center">
            Lyn Enia's Travelers' Inn
          </Text>

          <Text className="text-white/80 text-center mt-2 mb-6">
            Your home away from home
          </Text>

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push("/auth/register")}
              className="bg-green-500 px-6 py-3 rounded-full"
            >
              <Text className="text-white font-bold">Book Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/auth/login")}
              className="bg-white px-6 py-3 rounded-full"
            >
              <Text className="text-gray-700 font-bold">Login</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ImageBackground>

      {/* ROOMS */}
      <View className="px-4 pb-10">
        <Text className="text-xl font-bold text-center mb-4">
          Available Rooms
        </Text>

        {loading ? (
          <Text className="text-center text-gray-400">
            Loading rooms...
          </Text>
        ) : (
          rooms.slice(0, 3).map((room, index) => (
            <View
              key={index}
              className="bg-gray-100 p-4 rounded-xl mb-3"
            >
              <Text className="font-bold">{room.name}</Text>
              <Text className="text-gray-500">
                {room.description}
              </Text>
            </View>
          ))
        )}
      </View>

    </ScrollView>
  );
}