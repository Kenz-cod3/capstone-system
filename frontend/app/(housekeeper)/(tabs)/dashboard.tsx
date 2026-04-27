import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView
} from "react-native";
import { useEffect, useState } from "react";
import api from "@/services/api";
import { LinearGradient } from "expo-linear-gradient";

export default function Dashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
  });

  const getTasks = async () => {
    try {
      setLoading(true);

      const res = await api.get("/housekeeper/tasks");

      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];

      console.log("TASKS:", data);

      setTasks(data);

      // ✅ FINAL STATUS MAPPING
      const completed = data.filter((t: any) => t.status === "available").length;
      const pending = data.filter((t: any) => t.status === "dirty").length;
      const inProgress = data.filter((t: any) => t.status === "cleaning").length;

      setStats({
        total: data.length,
        completed,
        pending,
        inProgress,
      });
    } catch (error) {
      console.log("Dashboard error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    getTasks();
  };

  useEffect(() => {
    getTasks();
  }, []);

  // ✅ COMPLETE (room becomes available)
  const markDone = async (id: number) => {
    await api.post(`/housekeeper/tasks/${id}/complete`);
    getTasks();
  };

  // ✅ START CLEANING
  const markInProgress = async (id: number) => {
    await api.post(`/housekeeper/tasks/${id}/start`);
    getTasks();
  };

  // ✅ STATUS DISPLAY
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "available":
        return { color: "#10b981", text: "Completed" };
      case "cleaning":
        return { color: "#f59e0b", text: "In Progress" };
      case "dirty":
        return { color: "#ef4444", text: "Pending" };
      default:
        return { color: "#6b7280", text: "Unknown" };
    }
  };

  const TaskCard = ({ item }: any) => {
    const status = getStatusInfo(item.status);
    const isDone = item.status === "available";

    return (
      <View className="bg-white p-5 mb-4 rounded-2xl shadow">
        <Text className="font-bold text-xl mb-2">
          Room {item.room_number}
        </Text>

        <Text style={{ color: status.color }} className="mb-3">
          {status.text}
        </Text>

        {!isDone && (
          <View className="flex-row gap-2">
            {item.status === "dirty" && (
              <TouchableOpacity
                onPress={() => markInProgress(item.id)}
                className="flex-1 bg-yellow-500 p-3 rounded-xl"
              >
                <Text className="text-white text-center">
                  Start Cleaning
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => markDone(item.id)}
              className="flex-1 bg-green-500 p-3 rounded-xl"
            >
              <Text className="text-white text-center">
                Mark Done
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isDone && (
          <Text className="text-green-600 font-bold">
            ✔ Completed
          </Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* HEADER */}
      <LinearGradient
        colors={["#10b981", "#059669"]}
        style={{ paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 }}
      >
        <Text className="text-white text-2xl font-bold">
          Housekeeper Dashboard
        </Text>

        <Text className="text-white/80 mt-2">
          {new Date().toDateString()}
        </Text>
      </LinearGradient>

      {/* STATS */}
      <View className="p-5 -mt-6">
        <View className="flex-row gap-2 mb-4">
          <Stat title="Total" value={stats.total} />
          <Stat title="Done" value={stats.completed} />
        </View>

        <View className="flex-row gap-2 mb-4">
          <Stat title="In Progress" value={stats.inProgress} />
          <Stat title="Pending" value={stats.pending} />
        </View>
      </View>

      {/* LIST */}
      <View className="px-5 pb-20">
        {loading ? (
          <ActivityIndicator size="large" color="#10b981" />
        ) : tasks.length === 0 ? (
          <Text className="text-center mt-10 text-gray-400">
            No tasks
          </Text>
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <TaskCard item={item} />}
            scrollEnabled={false}
          />
        )}
      </View>
    </ScrollView>
  );
}

const Stat = ({ title, value }: any) => (
  <View className="bg-white flex-1 p-4 rounded-xl">
    <Text className="text-gray-500">{title}</Text>
    <Text className="text-xl font-bold">{value}</Text>
  </View>
);