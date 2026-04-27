import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useEffect, useState } from "react";
import api from "@/services/api";

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getTasks = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const res = await api.get("/housekeeper/tasks");

      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];

      // 🔥 FILTER CLEANING TASKS ONLY
      const cleaningTasks = data.filter(
        (t: any) => t.status === "cleaning"
      );

      setTasks(cleaningTasks);

    } catch (error) {
      console.log("Tasks error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🔥 PULL DOWN REFRESH
  const onRefresh = () => {
    setRefreshing(true);
    getTasks(true);
  };

  useEffect(() => {
    getTasks();
  }, []);

  // ✅ MARK DONE
  const markDone = async (id: number) => {
    try {
      await api.post(`/housekeeper/tasks/${id}/complete`);
      getTasks(); // refresh after action
    } catch (e) {
      console.log("Complete error:", e);
    }
  };

  const TaskCard = ({ item }: any) => {
    return (
      <View className="bg-white p-5 mb-4 rounded-2xl shadow">
        <Text className="font-bold text-xl mb-2">
          Room {item.room_number}
        </Text>

        <Text className="text-yellow-500 mb-3 font-semibold">
          In Progress
        </Text>

        <TouchableOpacity
          onPress={() => markDone(item.id)}
          className="bg-green-500 p-3 rounded-xl"
        >
          <Text className="text-white text-center font-bold">
            Mark as Cleaned
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50 px-5 pt-5">
      <Text className="text-2xl font-bold mb-4">
        Active Tasks
      </Text>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#10b981" />
      ) : tasks.length === 0 ? (
        <Text className="text-center mt-10 text-gray-400">
          No active cleaning tasks
        </Text>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <TaskCard item={item} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#10b981"]} // Android color
              tintColor="#10b981" // iOS color
            />
          }
        />
      )}
    </View>
  );
}