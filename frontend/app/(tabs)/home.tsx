import {
  View,
  Text,
  TextInput,
  FlatList,
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

export default function Home() {
  const { user, token, isLoaded } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets(); // 🔥 IMPORTANT

  const [rooms, setRooms] = useState<any[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [groupedRooms, setGroupedRooms] = useState<any>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔒 Protect route
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) router.replace("/auth/login");
  }, [user, isLoaded]);

  // 🔄 Fetch rooms
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
      setRooms(data);

      const grouped: any = {};
      data.forEach((room) => {
        const type = room.room_type?.type_name || "Others";
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(room);
      });

      setGroupedRooms(grouped);
    } catch (e) {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <Text className="text-gray-500">Loading rooms...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      <ScrollView
        className="flex-1 px-4 pt-2"
        contentContainerStyle={{
          paddingBottom: 100 + insets.bottom, // 🔥 FIX HERE
        }}
        showsVerticalScrollIndicator={false}
      >

        {/* 👋 HEADER */}
        <Text className="text-2xl font-bold mb-4">
          Hello, {user?.first_name || "Guest"} 👋
        </Text>

        {/* 🔍 SEARCH */}
        <TextInput
          placeholder="Search rooms..."
          value={search}
          onChangeText={setSearch}
          className="border border-gray-200 rounded-xl p-3 mb-4"
        />

        {/* 📂 ROOM TYPES */}
        {Object.keys(groupedRooms).map((type) => (
          <View key={type} className="mb-6">

            <Text className="text-lg font-bold mb-3">
              {type}
            </Text>

            <FlatList
              data={groupedRooms[type]}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item: any) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    if (isNavigating) return;

                    setIsNavigating(true);

                    router.push({
                      pathname: "/bookings/details",
                      params: {
                        room: JSON.stringify(item),
                      },
                    });

                    setTimeout(() => {
                      setIsNavigating(false);
                    }, 1000);
                  }}
                  className={`w-60 mr-3 rounded-2xl p-3 ${
                    item.status === "available"
                      ? "bg-green-50"
                      : item.status === "occupied"
                      ? "bg-blue-50"
                      : "bg-red-50"
                  }`}
                >

                  {/* 🖼 IMAGE */}
                  <Image
                    source={{
                      uri: item.image_url || "https://picsum.photos/300",
                    }}
                    className="w-full h-36 rounded-xl mb-2"
                  />

                  {/* 🏨 ROOM */}
                  <Text className="font-bold">
                    Room {item.room_number}
                  </Text>

                  {/* 💰 PRICE */}
                  <Text className="text-gray-500">
                    ₱{item.room_type?.base_price}
                  </Text>

                  {/* 🎯 STATUS */}
                  <View
                    className={`self-start px-3 py-1 rounded-full mt-2 ${
                      item.status === "available"
                        ? "bg-green-100"
                        : item.status === "occupied"
                        ? "bg-blue-100"
                        : "bg-red-100"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold capitalize ${
                        item.status === "available"
                          ? "text-green-600"
                          : item.status === "occupied"
                          ? "text-blue-600"
                          : "text-red-600"
                      }`}
                    >
                      {item.status}
                    </Text>
                  </View>

                </TouchableOpacity>
              )}
            />
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}