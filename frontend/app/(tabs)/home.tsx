import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";

const { width, height } = Dimensions.get("window");

export default function Home() {
  const router = useRouter();
  const { user } = useAuthStore();

  const handleBook = () => {
    if (!user) {
      router.push("/auth/login");
    } else {
      router.push("/bookings/details");
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      
      {/* HERO */}
      <ImageBackground
        source={require("../../assets/bg.jpg")}
        style={{ height: height * 0.5 }}
        resizeMode="cover"
        className="justify-center items-center"
      >
        {/* OVERLAY */}
        <View className="absolute inset-0 bg-green-800/50" />

        <View
          className="items-center"
          style={{ paddingHorizontal: width * 0.08 }}
        >
          {/* LOGO */}
          <Image
            source={require("../../assets/logo.jpg")}
            style={{
              width: height * 0.12,
              height: height * 0.12,
            }}
            className="mb-4 rounded-full border-4 border-white"
          />

          {/* TITLE */}
          <Text
            style={{ fontSize: height * 0.028 }}
            className="text-white font-bold text-center"
          >
            Lyn Enia's Travelers' Inn
          </Text>

          {/* SUBTITLE */}
          <Text
            style={{ fontSize: height * 0.016 }}
            className="text-white text-center mt-2 opacity-90"
          >
            Your home away from home
          </Text>

          {/* BUTTONS */}
          <View className="flex-row mt-6 gap-3">
            <TouchableOpacity
              onPress={handleBook}
              style={{
                paddingHorizontal: width * 0.06,
                paddingVertical: height * 0.015,
              }}
              className="bg-green-500 rounded-full shadow-lg"
            >
              <Text className="text-white font-semibold">Book Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/auth/login")}
              style={{
                paddingHorizontal: width * 0.06,
                paddingVertical: height * 0.015,
              }}
              className="bg-white rounded-full shadow-lg"
            >
              <Text className="text-gray-800 font-semibold">Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      {/* SERVICES */}
      <View style={{ paddingHorizontal: width * 0.05 }} className="py-6">
        <Text className="text-xl font-bold text-center mb-4">
          Why Stay With Us?
        </Text>

        {[
          "Comfortable Rooms",
          "Secure & Safe",
          "WiFi Available",
        ].map((item, i) => (
          <View
            key={i}
            className="bg-gray-50 p-4 rounded-2xl mb-3 shadow-sm"
          >
            <Text className="font-semibold">{item}</Text>
            <Text className="text-gray-500 text-sm mt-1">
              Clean, safe and comfortable experience
            </Text>
          </View>
        ))}
      </View>

      {/* ROOMS */}
      <View style={{ paddingHorizontal: width * 0.05 }} className="pb-6">
        <Text className="text-xl font-bold text-center mb-4">
          Available Rooms
        </Text>

        {[
          "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b",
        ].map((img, i) => (
          <View
            key={i}
            className="bg-white rounded-2xl mb-4 shadow-md overflow-hidden"
          >
            <Image
              source={{ uri: img }}
              style={{
                width: "100%",
                height: height * 0.22,
              }}
              resizeMode="cover"
            />

            <View className="p-4">
              <Text className="font-bold text-lg">Deluxe Room</Text>

              <Text className="text-green-600 font-semibold mt-1">
                ₱1800 / night
              </Text>

              <TouchableOpacity
                onPress={handleBook}
                style={{
                  paddingVertical: height * 0.015,
                }}
                className="bg-green-500 mt-4 rounded-xl"
              >
                <Text className="text-white text-center font-semibold">
                  Book Now
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

    </ScrollView>
  );
}