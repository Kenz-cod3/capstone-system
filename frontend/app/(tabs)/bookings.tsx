import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useEffect, useState } from "react";
import api from "@/services/api";

export default function Bookings() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "history">("all");

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/bookings");
      setData(res.data);
    } catch (e: any) {
      console.log("❌ FETCH ERROR:", e?.response || e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/bookings");
      setData(res.data);
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // 🔥 FILTER LOGIC
  const filteredData = data.filter((item) => {
    if (filter === "active") {
      return !["checked_out", "cancelled"].includes(item.booking_status);
    }
    if (filter === "history") {
      return ["checked_out", "cancelled"].includes(item.booking_status);
    }
    return true;
  });

  const getStatusStyle = (status: string) => {
    if (status === "pending") return "bg-yellow-100 text-yellow-600";
    if (status === "checked_in") return "bg-blue-100 text-blue-600";
    if (status === "checked_out") return "bg-green-100 text-green-600";
    if (status === "cancelled") return "bg-red-100 text-red-600";
    return "bg-gray-100 text-gray-600";
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">

      {/* 🔥 HEADER */}
      <Text className="text-2xl font-bold px-4 mt-4 mb-2">
        My Bookings
      </Text>

      {/* 🔥 FILTER */}
      <View className="flex-row justify-around mb-3 px-2">
        {["all", "active", "history"].map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => setFilter(item as any)}
            className={`px-4 py-2 rounded-full ${
              filter === item ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                filter === item ? "text-white" : "text-gray-600"
              }`}
            >
              {item.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 🔥 LIST */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          padding: 15,
          paddingBottom: 120, // 🔥 FIX: space sa bottom
        }}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center mt-20">
            <Text className="text-gray-400">No bookings found</Text>
          </View>
        }
        renderItem={({ item }) => {
          return (
            <View className="bg-white rounded-2xl mb-4 overflow-hidden shadow-md">

              {/* 🖼 IMAGE */}
              <Image
                source={{
                  uri:
                    item.rooms?.[0]?.image_url ||
                    "https://picsum.photos/400",
                }}
                className="w-full h-48"
              />

              {/* 📦 CONTENT */}
              <View className="p-4">

                {/* ROOM */}
                <Text className="text-lg font-bold">
                  Room {item.rooms?.[0]?.room_number || "N/A"}
                </Text>

                {/* STATUS */}
                <View
                  className={`self-start px-3 py-1 rounded-full mt-2 ${getStatusStyle(
                    item.booking_status
                  )}`}
                >
                  <Text className="text-xs font-semibold capitalize">
                    {item.booking_status?.replace("_", " ")}
                  </Text>
                </View>

                {/* DATES */}
                <Text className="text-gray-400 text-sm mt-2">
                  {item.check_in_date} → {item.check_out_date}
                </Text>

                {/* PRICE */}
                <Text className="text-blue-600 font-bold mt-1 text-lg">
                  ₱{item.total_price}
                </Text>

              </View>
            </View>
          );
        }}
      />
    </View>
  );
}