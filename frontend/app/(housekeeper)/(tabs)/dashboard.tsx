import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import api from "@/services/api";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";
import {
  Sparkles,
  Clock,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  Circle,
  CircleCheck,
  TrendingUp,
  ArrowRight,
  Home,
  DoorOpen,
  ShieldAlert,
  Droplets,
  Paintbrush,
  Trash2,
  Calendar,
  Sun,
  Moon,
  CloudSun,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function Dashboard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

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

      // Fetch both endpoints at the same time
      const [tasksRes, historyRes] = await Promise.all([
        api.get("/housekeeper/tasks"),
        api.get("/housekeeper/history"),
      ]);

      const data: any[] = Array.isArray(tasksRes.data)
        ? tasksRes.data
        : tasksRes.data?.data || [];

      const history: any[] = Array.isArray(historyRes.data)
        ? historyRes.data
        : historyRes.data?.data || [];

      // Active tasks shown in the list (dirty + cleaning only)
      const cleaningTasks = data.filter(
        (t: any) => t.status === "dirty" || t.status === "cleaning"
      );

      setTasks(cleaningTasks);

      setStats({
        total: data.length + history.length,         // active + completed
        completed: history.length,                    // ✅ from history endpoint
        pending: data.filter((t: any) => t.status === "dirty").length,
        inProgress: data.filter((t: any) => t.status === "cleaning").length,
        damaged: data.filter((t: any) => t.has_damage).length,
      });
    } catch (error) {
      console.log("Dashboard error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      getTasks();
    }, [])
  );

  const onRefresh = () => { setRefreshing(true); getTasks(true); };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return { text: "Good morning", icon: Sun, color: "#fbbf24" };
    if (h < 17) return { text: "Good afternoon", icon: CloudSun, color: "#f59e0b" };
    return { text: "Good evening", icon: Moon, color: "#818cf8" };
  };

  const firstName = user?.first_name || "Housekeeper";
  const greetingData = greeting();
  const GreetingIcon = greetingData.icon;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "cleaning":
        return {
          bg: "#fffbeb",
          border: "#fde68a",
          dot: "#f59e0b",
          badge: "#fef3c7",
          badgeText: "#92400e",
          label: "In Progress",
          icon: Droplets,
          color: "#f59e0b",
        };
      case "dirty":
        return {
          bg: "#fff1f2",
          border: "#fecdd3",
          dot: "#ef4444",
          badge: "#fee2e2",
          badgeText: "#991b1b",
          label: "Needs Cleaning",
          icon: AlertTriangle,
          color: "#ef4444",
        };
      case "maintenance":
        return {
          bg: "#f5f3ff",
          border: "#ddd6fe",
          dot: "#8b5cf6",
          badge: "#ede9fe",
          badgeText: "#5b21b6",
          label: "Maintenance",
          icon: Wrench,
          color: "#8b5cf6",
        };
      default:
        return {
          bg: "#f9fafb",
          border: "#e5e7eb",
          dot: "#9ca3af",
          badge: "#f3f4f6",
          badgeText: "#374151",
          label: "Unknown",
          icon: Home,
          color: "#9ca3af",
        };
    }
  };

  const TaskCard = ({ item, index }: any) => {
    const config = getStatusConfig(item.status);
    const StatusIcon = config.icon;

    return (
      <TouchableOpacity
        onPress={() => router.push({ pathname: "/tasks", params: { roomId: item.id } })}
        activeOpacity={0.85}
        style={{
          marginHorizontal: 20,
          marginBottom: 12,
          borderRadius: 20,
          backgroundColor: config.bg,
          borderWidth: 1.5,
          borderColor: config.border,
          shadowColor: config.dot,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View style={{ padding: 18 }}>
          {/* TOP ROW */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {/* ICON CIRCLE */}
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: "white",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}>
                <StatusIcon size={22} color={config.color} strokeWidth={1.8} />
              </View>

              <View>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827", letterSpacing: -0.3 }}>
                  Room {item.room_number}
                </Text>
                {item.room_type && (
                  <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>
                    {item.room_type}
                  </Text>
                )}
              </View>
            </View>

            {/* STATUS BADGE */}
            <View style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 20,
              backgroundColor: config.badge,
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
            }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: config.dot }} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: config.badgeText }}>
                {config.label}
              </Text>
            </View>
          </View>

          {/* DIVIDER */}
          <View style={{ height: 1, backgroundColor: config.border, marginBottom: 12 }} />

          {/* BOTTOM ROW */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            {item.damage_summary ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <ShieldAlert size={14} color="#dc2626" />
                <Text style={{ fontSize: 12, color: "#dc2626", fontWeight: "600" }}>
                  Has damage report
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: "#9ca3af" }}>
                No damage reported
              </Text>
            )}

            <View style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: "white",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 10,
            }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#059669" }}>
                Open
              </Text>
              <ArrowRight size={12} color="#059669" strokeWidth={2} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const completionRate = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  const Header = () => (
    <>
      {/* HERO SECTION */}
      <LinearGradient
        colors={["#064e3b", "#065f46", "#059669"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 60, paddingBottom: 32, paddingHorizontal: 20 }}
      >
        {/* GREETING */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <GreetingIcon size={20} color={greetingData.color} strokeWidth={1.8} />
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "500", letterSpacing: 0.5 }}>
              {greetingData.text},
            </Text>
          </View>
          <Text style={{ color: "white", fontSize: 28, fontWeight: "800", letterSpacing: -0.5, marginTop: 4 }}>
            {firstName} 👋
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
            <Calendar size={12} color="rgba(255,255,255,0.5)" />
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
          </View>
        </View>

        {/* PROGRESS CARD */}
        <View style={{
          backgroundColor: "rgba(255,255,255,0.12)",
          borderRadius: 20,
          padding: 18,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(10px)",
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TrendingUp size={16} color="rgba(255,255,255,0.8)" />
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" }}>
                Today's Progress
              </Text>
            </View>
            <Text style={{ color: "white", fontSize: 24, fontWeight: "800" }}>
              {completionRate}%
            </Text>
          </View>

          {/* PROGRESS BAR */}
          <View style={{ height: 8, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 4, overflow: "hidden" }}>
            <View style={{
              height: "100%",
              width: `${completionRate}%`,
              backgroundColor: "#34d399",
              borderRadius: 4,
            }} />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
              {stats.completed} of {stats.total} rooms completed
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
              {stats.total - stats.completed} remaining
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* STATS GRID */}
      <View style={{ paddingHorizontal: 20, marginTop: -20 }}>
        <View style={{
          backgroundColor: "white",
          borderRadius: 24,
          padding: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 5,
        }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatBox label="Pending" value={stats.pending} color="#ef4444" bg="#fff1f2" icon={AlertTriangle} />
            <StatBox label="Cleaning" value={stats.inProgress} color="#f59e0b" bg="#fffbeb" icon={Droplets} />
            <StatBox label="Done" value={stats.completed} color="#10b981" bg="#ecfdf5" icon={CheckCircle2} />
            <StatBox label="Damaged" value={stats.damaged} color="#8b5cf6" bg="#f5f3ff" icon={ShieldAlert} />
          </View>
        </View>
      </View>

      {/* SECTION HEADER */}
      <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827", letterSpacing: -0.3 }}>
            Rooms to Clean
          </Text>
          <Text style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
            {tasks.length} room{tasks.length !== 1 ? "s" : ""} remaining
          </Text>
        </View>

        {tasks.length > 0 && (
          <View style={{
            backgroundColor: "#ecfdf5",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}>
            <CircleCheck size={12} color="#059669" />
            <Text style={{ fontSize: 12, color: "#059669", fontWeight: "700" }}>
              {tasks.length} active
            </Text>
          </View>
        )}
      </View>
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => <TaskCard item={item} index={index} />}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={<Header />}
        ListEmptyComponent={
          loading ? null : (
            <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 40 }}>
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "#ecfdf5",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}>
                <Sparkles size={40} color="#10b981" strokeWidth={1.5} />
              </View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827", textAlign: "center", letterSpacing: -0.5 }}>
                All Clear!
              </Text>
              <Text style={{ fontSize: 14, color: "#9ca3af", textAlign: "center", marginTop: 8, lineHeight: 20 }}>
                No rooms need cleaning right now. Great work!
              </Text>
            </View>
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
            <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 20 }} />
          ) : null
        }
      />
    </View>
  );
}

const StatBox = ({ label, value, color, bg, icon: Icon }: any) => (
  <View style={{
    flex: 1,
    backgroundColor: bg,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    gap: 6,
  }}>
    <Icon size={20} color={color} strokeWidth={1.8} />
    <Text style={{ fontSize: 22, fontWeight: "800", color, letterSpacing: -0.5 }}>
      {value}
    </Text>
    <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600", textAlign: "center" }}>
      {label}
    </Text>
  </View>
);