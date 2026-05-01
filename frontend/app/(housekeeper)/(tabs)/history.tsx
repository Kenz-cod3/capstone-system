import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { useEffect, useState } from "react";
import api from "../../../services/api";
import { SafeAreaView } from "react-native-safe-area-context";

interface HistoryItem {
  id: number;
  changed_at?: string;
  user?: {
    first_name?: string;
    last_name?: string;
  };
  booking?: {
    booking_reference?: string;
    rooms?: {
      room_number?: string;
    }[];
  };
}

export default function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getHistory = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const res = await api.get("/housekeeper/history");

      console.log("HISTORY RAW:", res.data);

      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];

      setHistory(data);
    } catch (error: any) {
      console.log(
        "❌ History Error:",
        error?.response?.data || error.message
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    getHistory(true);
  };

  useEffect(() => {
    getHistory();
  }, []);

  // 🔄 Loading
  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color="#22c55e" />
        <Text className="mt-2 text-gray-500">Loading history...</Text>
      </SafeAreaView>
    );
  }

  // 📭 Empty
  if (history.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Text className="text-gray-400">
          No completed tasks yet
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <FlatList
        data={history}
        keyExtractor={(item, index) =>
          item?.id ? item.id.toString() : index.toString()
        }
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#22c55e"]}
            tintColor="#22c55e"
          />
        }
        renderItem={({ item }) => {
          const roomNumber =
            item?.booking?.rooms?.[0]?.room_number || "N/A";

          const reference =
            item?.booking?.booking_reference || "N/A";

          const cleanerName = item?.user
            ? `${item.user.first_name ?? ""} ${item.user.last_name ?? ""}`.trim()
            : "N/A";

          return (
            <View className="bg-white p-4 mb-3 rounded-xl shadow">
              {/* 🏨 ROOM */}
              <Text className="font-bold text-lg">
                Room {roomNumber}
              </Text>

              {/* 🧾 BOOKING REF */}
              <Text className="text-gray-500">
                Ref: {reference}
              </Text>

              {/* STATUS */}
              <Text className="text-green-600 font-semibold mt-1">
                ✔ Completed
              </Text>

              {/* DATE */}
              <Text className="text-gray-500">
                {item?.changed_at
                  ? new Date(item.changed_at).toLocaleString()
                  : "No date"}
              </Text>

              {/* CLEANER */}
              <Text className="text-gray-400 mt-1">
                Cleaned by: {cleanerName}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}