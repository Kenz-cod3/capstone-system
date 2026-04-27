import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useEffect, useState } from "react";
import api from "../../../services/api";

interface Task {
  id?: number;
  room_number?: string;
  status?: string;
  completed_at?: string;
  cleaner?: {
    name?: string;
  };
}

export default function History() {
  const [history, setHistory] = useState<Task[]>([]);
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
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#22c55e" />
        <Text className="mt-2 text-gray-500">Loading history...</Text>
      </View>
    );
  }

  // 📭 Empty
  if (history.length === 0) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-gray-400">
          No completed tasks yet
        </Text>
      </View>
    );
  }

  return (
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
      renderItem={({ item }) => (
        <View className="bg-white p-4 mb-3 rounded-xl shadow">
          {/* ROOM */}
          <Text className="font-bold text-lg">
            Room {item?.room_number || "N/A"}
          </Text>

          {/* STATUS */}
          <Text className="text-green-600 font-semibold">
            ✔ Completed
          </Text>

          {/* DATE */}
          <Text className="text-gray-500">
            {item?.completed_at
              ? new Date(item.completed_at).toLocaleString()
              : "No date"}
          </Text>

          {/* CLEANED BY (OPTIONAL) */}
          {item?.cleaner?.name && (
            <Text className="text-gray-400 mt-1">
              Cleaned by: {item.cleaner.name}
            </Text>
          )}
        </View>
      )}
    />
  );
}