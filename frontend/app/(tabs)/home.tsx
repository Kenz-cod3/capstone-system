import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "expo-router";
import { getRooms } from "@/services/roomService";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function Home() {
  const { user, token, isLoaded } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [allRooms, setAllRooms] = useState<any[]>([]); // 🔥 original data
  const [rooms, setRooms] = useState<any[]>([]);
  const [groupedRooms, setGroupedRooms] = useState<any>({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  // 🔐 auth check
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) router.replace("/auth/login");
  }, [user, isLoaded]);

  // 📦 fetch once
  useEffect(() => {
    if (!isLoaded || !token) return;
    fetchRooms();
  }, [isLoaded, token]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await getRooms();
      const result = res?.data || res;
      const data = Array.isArray(result) ? result : [];

      setAllRooms(data); // 🔥 store once
    } catch (e) {
      setAllRooms([]);
    } finally {
      setLoading(false);
    }
  };

  // ⏳ debounce (smooth typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // 🔍 filter locally (NO LOADING HERE 🔥)
  useEffect(() => {
    const filtered = allRooms.filter((room) =>
      room.room_number.toString().includes(debouncedSearch)
    );

    setRooms(filtered);

    const grouped: any = {};
    filtered.forEach((room) => {
      const type = room.room_type?.type_name || "Others";
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(room);
    });

    setGroupedRooms(grouped);
  }, [debouncedSearch, allRooms]);

  // 🟡 ONLY initial loading
  if (!isLoaded || loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <Text className="text-gray-400 text-base">Loading rooms...</Text>
      </SafeAreaView>
    );
  }

  const headerHeight = 320 + insets.top;

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* 🌿 Gradient */}
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

      {/* 🔔 FLOATING ICONS */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 50,
          right: 20,
          flexDirection: "row",
          zIndex: 999,
        }}
      >
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/chat/[userId]",
              params: { userId: "1" },
            })
          }
          style={{ padding: 8 }}
        >
          <Ionicons name="chatbubble-outline" size={22} color="#065f46" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/notifications/notification")}
          style={{ padding: 8 }}
        >
          <Ionicons name="notifications-outline" size={22} color="#065f46" />

          <View
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#ef4444",
            }}
          />
        </TouchableOpacity>
      </View>

      {/* 📜 CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 120 + insets.bottom,
        }}
      >
        {/* HEADER */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: insets.top + 40,
            paddingBottom: 20,
          }}
        >
          <Text className="text-emerald-800 text-sm opacity-80">
            Welcome to
          </Text>

          <Text className="text-emerald-900 text-2xl font-bold mt-1">
            Lyn Enia's Travelers' Inn
          </Text>

          <Text className="text-emerald-800 mt-2 opacity-90">
            Hello, {user?.first_name || "Guest"} 👋
          </Text>

          {/* 🔍 SEARCH */}
          <View className="bg-white rounded-xl mt-4 px-4 py-3 shadow-sm">
            <TextInput
              placeholder="Search room number..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#9ca3af"
              className="text-gray-800"
            />
          </View>
        </View>

        {/* 🏨 ROOMS */}
        <View className="px-4 pt-2">
          {Object.keys(groupedRooms).length === 0 && (
            <Text className="text-center text-gray-400 mt-10">
              No rooms found
            </Text>
          )}

          {Object.keys(groupedRooms).map((type) => (
            <View key={type} className="mb-8">
              <Text className="text-lg font-semibold mb-3 text-gray-800">
                {type}
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {groupedRooms[type].map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (isNavigating) return;
                      setIsNavigating(true);

                      router.push({
                        pathname: "/bookings/details",
                        params: {
                          room: JSON.stringify(item),
                        },
                      });

                      setTimeout(() => setIsNavigating(false), 800);
                    }}
                    style={{
                      width: 280,
                      marginRight: 16,
                    }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100"
                  >
                    <Image
                      source={{
                        uri: item.image_url || "https://picsum.photos/300",
                      }}
                      className="w-full h-40 rounded-t-2xl"
                    />

                    <View className="p-4">
                      <Text className="font-bold text-gray-800 text-lg">
                        Room {item.room_number}
                      </Text>

                      <Text className="text-gray-500 text-base mt-1">
                        ₱{item.room_type?.base_price}
                      </Text>

                      <View
                        className={`mt-3 self-start px-3 py-1.5 rounded-full ${
                          item.status === "available"
                            ? "bg-emerald-100"
                            : item.status === "occupied"
                            ? "bg-blue-100"
                            : "bg-red-100"
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold capitalize ${
                            item.status === "available"
                              ? "text-emerald-700"
                              : item.status === "occupied"
                              ? "text-blue-700"
                              : "text-red-700"
                          }`}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}