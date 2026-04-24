import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import api from "@/services/api";

export default function Bookings() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"active" | "history">("active");
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Gradient Background */}
      <LinearGradient
        colors={["#d1fae5", "#a7f3d0", "#ffffff"]}
        locations={[0, 0.3, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: insets.top + 120,
        }}
      />

      <View className="flex-1">
        {/* 🔥 HEADER WITH HISTORY ICON ON RIGHT CORNER */}
        <View
          style={{
            paddingTop: insets.top + 10,
            paddingBottom: 10,
            paddingHorizontal: 16,
            backgroundColor: "transparent",
          }}
        >
          <View className="flex-row justify-between items-center">
            <Text className="text-3xl font-bold text-emerald-800">
              My Bookings
            </Text>
            
            {/* History Icon - Right Corner */}
            <TouchableOpacity
              onPress={() => setFilter(filter === "active" ? "history" : "active")}
              className="p-2"
            >
              <Ionicons
                name="time-outline"
                size={28}
                color={filter === "history" ? "#059669" : "#9ca3af"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 🔥 FILTER BUTTONS - Both Always Visible */}
        <View className="flex-row items-center px-4 mb-3 mt-2">
          {/* Active Button */}
          <TouchableOpacity
            onPress={() => setFilter("active")}
            className={`px-5 py-2 rounded-full mr-3 ${
              filter === "active" ? "bg-emerald-600" : "bg-gray-200"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                filter === "active" ? "text-white" : "text-gray-600"
              }`}
            >
              Active
            </Text>
          </TouchableOpacity>

          {/* History Button */}
          {/* <TouchableOpacity
            onPress={() => setFilter("history")}
            className={`px-5 py-2 rounded-full ${
              filter === "history" ? "bg-emerald-600" : "bg-gray-200"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                filter === "history" ? "text-white" : "text-gray-600"
              }`}
            >
              History
            </Text>
          </TouchableOpacity> */}
        </View>

        {/* 🔥 LIST */}
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={["#10b981"]}
              tintColor="#10b981"
            />
          }
          contentContainerStyle={{
            padding: 15,
            paddingBottom: 120,
          }}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center mt-20">
              <View className="bg-gray-100 rounded-full p-6 mb-4">
                <Ionicons 
                  name={filter === "active" ? "calendar-outline" : "time-outline"} 
                  size={48} 
                  color="#9ca3af" 
                />
              </View>
              <Text className="text-gray-400 text-lg font-medium">
                {filter === "active" ? "No active bookings" : "No booking history"}
              </Text>
              <Text className="text-gray-400 text-sm mt-1">
                {filter === "active" 
                  ? "Your active bookings will appear here" 
                  : "Your past bookings will appear here"}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            return (
              <View className="bg-white rounded-2xl mb-4 overflow-hidden shadow-md">
                {/* IMAGE */}
                <Image
                  source={{
                    uri:
                      item.rooms?.[0]?.image_url ||
                      "https://picsum.photos/400",
                  }}
                  className="w-full h-48"
                />

                {/* CONTENT */}
                <View className="p-4">
                  {/* ROOM */}
                  <Text className="text-lg font-bold text-gray-800">
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
                  <View className="flex-row items-center mt-2">
                    <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                    <Text className="text-gray-500 text-sm ml-1">
                      {item.check_in_date} → {item.check_out_date}
                    </Text>
                  </View>

                  {/* PRICE */}
                  <Text className="text-emerald-600 font-bold text-lg mt-2">
                    ₱{item.total_price}
                  </Text>

                  {/* VIEW DETAILS BUTTON */}
                  <TouchableOpacity className="bg-emerald-500 px-4 py-2 rounded-full mt-3 self-start">
                    <Text className="text-white text-xs font-semibold">
                      View Details
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}