import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { getRooms } from "@/services/roomService";
import { useAuthStore } from "@/store/authStore";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

export default function Welcome() {
  const router = useRouter();
  const { user, isLoaded } = useAuthStore();

  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 AUTO REDIRECT IF LOGGED IN
  useEffect(() => {
    if (!isLoaded) return;

    // if (user) {
    //   router.replace("/(tabs)/home");
    // }

    if (user) {
      if (user.role === "guest") {
        router.replace("/(guest)/(tabs)/home");
      } else if (user.role === "housekeeper") {
        router.replace("/(housekeeper)/(tabs)/dashboard");
      }
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
    <ScrollView className="flex-1 bg-[#faf8f3]" showsVerticalScrollIndicator={false}>

      <ImageBackground
        source={require("../assets/bg.jpg")}
        style={{ height: height * 0.55 }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["rgba(13,46,31,0.5)", "rgba(13,46,31,0.85)"]}
          className="absolute inset-0"
        />

        {/* Decorative circles */}
        <View
          className="absolute rounded-full border border-white/10"
          style={{ width: 260, height: 260, top: -70, right: -70 }}
        />
        <View
          className="absolute rounded-full border border-white/10"
          style={{ width: 160, height: 160, bottom: -40, left: -40 }}
        />

        <View className="flex-1 justify-center items-center px-6">

          <View className="bg-[#c9a96e]/15 border border-[#c9a96e]/40 p-3 rounded-full mb-4">
            <Image
              source={require("../assets/logo.jpg")}
              style={{
                width: height * 0.1,
                height: height * 0.1,
              }}
              className="rounded-full"
            />
          </View>

          <Text className="text-[#c9a96e] text-[11px] tracking-[4px] uppercase mb-2">
            Welcome to
          </Text>

          <Text
            className="text-white text-3xl text-center"
            style={{ fontFamily: "Georgia" }}
          >
            Lyn Enia's Travelers' Inn
          </Text>

          <Text
            className="text-white/60 text-center mt-2 mb-8"
            style={{ fontFamily: "Georgia", fontStyle: "italic" }}
          >
            Your home away from home
          </Text>

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push("/auth/register")}
              activeOpacity={0.9}
              className="rounded-full overflow-hidden"
            >
              <LinearGradient
                colors={["#c9a96e", "#b8925a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="px-7 py-3.5"
              >
                <Text
                  className="text-[#0d2e1f] text-sm tracking-widest uppercase"
                  style={{ fontFamily: "Georgia" }}
                >
                  Book Now
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/auth/login")}
              activeOpacity={0.85}
              className="px-7 py-3.5 rounded-full bg-white/10 border border-white/30 justify-center"
            >
              <Text
                className="text-white text-sm tracking-widest uppercase"
                style={{ fontFamily: "Georgia" }}
              >
                Login
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </ImageBackground>

      {/* ROOMS */}
      <View className="px-6 pt-8 pb-12">
        <View className="flex-row items-center justify-center gap-3 mb-6">
          <View className="w-1 h-1 rounded-full bg-[#c9a96e]" />
          <Text
            className="text-[#1a4a35] text-xl"
            style={{ fontFamily: "Georgia" }}
          >
            Available Rooms
          </Text>
          <View className="w-1 h-1 rounded-full bg-[#c9a96e]" />
        </View>

        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator size="small" color="#1a4a35" />
            <Text className="text-center text-[#1a4a35]/40 text-sm mt-3">
              Loading rooms...
            </Text>
          </View>
        ) : (
          rooms.slice(0, 3).map((room, index) => (
            <View
              key={index}
              className="flex-row items-center bg-white p-4 rounded-2xl mb-3 border border-[#1a4a35]/10"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View className="w-10 h-10 rounded-full bg-[#1a4a35]/08 justify-center items-center mr-4">
                <Ionicons name="bed-outline" size={18} color="#1a4a35" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[#1a4a35] text-base"
                  style={{ fontFamily: "Georgia" }}
                >
                  {room.name}
                </Text>
                <Text className="text-[#1a4a35]/50 text-xs mt-0.5">
                  {room.description}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

    </ScrollView>
  );
}