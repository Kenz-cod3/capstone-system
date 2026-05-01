import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { useEffect, useState } from "react";
import api from "@/services/api";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Dashboard() {
  const router = useRouter();

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    damaged: 0,
  });

  const getTasks = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const res = await api.get("/housekeeper/tasks");

      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];

      // 🔥 ONLY CLEANING TASKS
      const cleaningTasks = data.filter(
        (t: any) =>
          t.status === "dirty" ||
          t.status === "cleaning"
      );

      setTasks(cleaningTasks);

      const completed = data.filter(
        (t: any) => t.status === "available"
      ).length;

      const pending = data.filter(
        (t: any) => t.status === "dirty"
      ).length;

      const inProgress = data.filter(
        (t: any) => t.status === "cleaning"
      ).length;

      // 🔥 FIX: count damage ONLY after inspection (optional backend fix)
      const damaged = data.filter(
        (t: any) =>
          t.status === "available" && t.has_damage
      ).length;

      setStats({
        total: data.length,
        completed,
        pending,
        inProgress,
        damaged,
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
    getTasks(true);
  };

  useEffect(() => {
    getTasks();
  }, []);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "cleaning":
        return { color: "#f59e0b", text: "In Progress" };

      case "dirty":
        return { color: "#ef4444", text: "Needs Cleaning" };

      default:
        return { color: "#6b7280", text: "Unknown" };
    }
  };

  const TaskCard = ({ item }: any) => {
    const status = getStatusInfo(item.status);

    return (
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/tasks",
            params: { roomId: item.id },
          })
        }
        // 🔥 ALWAYS WHITE (NO DAMAGE COLOR)
        className="p-5 mb-4 rounded-2xl shadow bg-white"
      >
        <Text className="font-bold text-xl mb-2">
          Room {item.room_number}
        </Text>

        <Text style={{ color: status.color }} className="mb-2">
          {status.text}
        </Text>

        {/* ❌ REMOVED DAMAGE WARNING HERE */}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <TaskCard item={item} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListHeaderComponent={
          <>
            <LinearGradient
              colors={["#10b981", "#059669"]}
              style={{
                paddingTop: 20,
                paddingBottom: 20,
                paddingHorizontal: 20,
              }}
            >
              <Text className="text-white text-2xl font-bold">
                Housekeeper Dashboard
              </Text>

              <Text className="text-white/80 mt-2">
                {new Date().toDateString()}
              </Text>
            </LinearGradient>

            <View className="p-5">
              <View className="flex-row gap-2 mb-4">
                <Stat title="Total" value={stats.total} />
                <Stat title="Done" value={stats.completed} />
              </View>

              <View className="flex-row gap-2 mb-4">
                <Stat title="In Progress" value={stats.inProgress} />
                <Stat title="Pending" value={stats.pending} />
              </View>

              <View className="flex-row gap-2 mb-4">
                <Stat title="Damaged" value={stats.damaged} />
              </View>

              <Text className="text-lg font-bold mb-2">
                Rooms to Clean
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? null : (
            <Text className="text-center mt-10 text-gray-400">
              No rooms need cleaning
            </Text>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#10b981"]}
            tintColor="#10b981"
          />
        }
        ListFooterComponent={
          loading ? (
            <ActivityIndicator size="large" color="#10b981" />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const Stat = ({ title, value }: any) => (
  <View className="bg-white flex-1 p-4 rounded-xl">
    <Text className="text-gray-500">{title}</Text>
    <Text className="text-xl font-bold">{value}</Text>
  </View>
);