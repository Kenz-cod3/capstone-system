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
import { LinearGradient } from "expo-linear-gradient";
import {
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Clock,
  Calendar,
  Home,
  DoorOpen,
  ClipboardCheck,
  Brush,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Wrench,
  CheckCheck,
  FileText,
  Hash,
  CircleCheck,
  CircleAlert,
} from "lucide-react-native";
import { useScrollToTop } from "@react-navigation/native";
import { useRef } from "react";

interface HistoryItem {
  id: number;
  room_number?: string;
  status?: string;
  has_damage?: boolean;
  room_type?: string;
  damage_summary?: {
    report_type?: string;
    note?: string;
    status?: string;
  } | null;
  completed_at?: string;
  changed_at?: string;
  user?: { first_name?: string; last_name?: string };
  booking?: {
    booking_reference?: string;
    rooms?: { room_number?: string }[];
  };
}

export default function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const flatListRef = useRef(null);
  useScrollToTop(flatListRef);

  const getHistory = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await api.get("/housekeeper/history");
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setHistory(data);
    } catch (error: any) {
      console.log("❌ History Error:", error?.response?.data || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); getHistory(true); };

  useEffect(() => { getHistory(); }, []);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return { date: "No date", time: "" };
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const totalDone = history.length;
  const totalDamaged = history.filter((h) => h.has_damage).length;
  const cleanRate = totalDone > 0 ? Math.round(((totalDone - totalDamaged) / totalDone) * 100) : 0;

  // Dynamic status bar style based on scroll position
  const statusBarStyle = isScrolled ? "dark-content" : "light-content";

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: "#ffffff", justifyContent: "center", alignItems: "center" }}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={{ marginTop: 10, color: "#6b7280", fontSize: 14 }}>Loading history...</Text>
      </View>
    );
  }

  const Header = () => (
    <>
      {/* HERO SECTION */}
      <LinearGradient
        colors={["#064e3b", "#065f46", "#059669"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 60, paddingBottom: 32, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <ClipboardCheck size={18} color="rgba(255,255,255,0.6)" strokeWidth={1.8} />
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "500", letterSpacing: 0.5 }}>
            Your Work
          </Text>
        </View>
        <Text style={{ color: "white", fontSize: 28, fontWeight: "800", letterSpacing: -0.5, marginTop: 2 }}>
          Cleaning History
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
          <Brush size={14} color="rgba(255,255,255,0.5)" />
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
            All completed cleaning tasks
          </Text>
        </View>
      </LinearGradient>

      {/* SUMMARY CARDS */}
      <View style={{ paddingHorizontal: 20, marginTop: -20, marginBottom: 8 }}>
        <View style={{
          backgroundColor: "white",
          borderRadius: 24,
          padding: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 5,
          flexDirection: "row",
          gap: 10,
        }}>
          <SummaryBox 
            label="Total Cleaned" 
            value={totalDone} 
            color="#10b981" 
            bg="#ecfdf5" 
            icon={CheckCircle2}
          />
          <SummaryBox 
            label="Had Damage" 
            value={totalDamaged} 
            color="#ef4444" 
            bg="#fff1f2" 
            icon={AlertTriangle}
          />
          <SummaryBox
            label="Clean Rate"
            value={cleanRate === 100 && totalDone > 0 ? "Perfect!" : `${cleanRate}%`}
            color="#3b82f6"
            bg="#eff6ff"
            icon={TrendingUp}
          />
        </View>
      </View>

      {/* SECTION LABEL */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Hash size={16} color="#9ca3af" />
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#374151" }}>
            {totalDone} Completed Room{totalDone !== 1 ? "s" : ""}
          </Text>
        </View>
        {totalDone > 0 && (
          <View style={{
            backgroundColor: "#f3f4f6",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
          }}>
            <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: "600" }}>
              Last 30 days
            </Text>
          </View>
        )}
      </View>
    </>
  );

  // Helper to get damage status icon and color
  const getDamageStatusConfig = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "resolved":
        return { icon: CheckCircle2, color: "#10b981", bg: "#d1fae5" };
      case "pending":
        return { icon: Clock, color: "#f59e0b", bg: "#fef3c7" };
      case "in_progress":
        return { icon: Wrench, color: "#8b5cf6", bg: "#ede9fe" };
      default:
        return { icon: AlertTriangle, color: "#dc2626", bg: "#fee2e2" };
    }
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    // Change status bar style when scrolled past the gradient section
    // The gradient height is approximately 180-200px
    setIsScrolled(offsetY > 160);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <StatusBar 
        barStyle={statusBarStyle} 
        backgroundColor="transparent" 
        translucent 
      />

      <FlatList
        ref={flatListRef}
        data={history}
        keyExtractor={(item, index) => item?.id?.toString() ?? index.toString()}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<Header />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#10b981"]}
            tintColor="#10b981"
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 40 }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#f3f4f6",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}>
              <Sparkles size={40} color="#9ca3af" strokeWidth={1.5} />
            </View>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827", textAlign: "center", letterSpacing: -0.5 }}>
              No History Yet
            </Text>
            <Text style={{ fontSize: 14, color: "#9ca3af", textAlign: "center", marginTop: 8, lineHeight: 20 }}>
              Completed cleaning tasks will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const roomNumber =
            item?.room_number ||
            item?.booking?.rooms?.[0]?.room_number ||
            "N/A";

          const dateStr = item?.completed_at || item?.changed_at;
          const { date, time } = formatDate(dateStr);

          const hasDamage = item?.has_damage ?? false;
          const damageType = item?.damage_summary?.report_type;
          const damageNote = item?.damage_summary?.note;
          const damageStatus = item?.damage_summary?.status;
          const DamageStatusIcon = hasDamage ? getDamageStatusConfig(damageStatus).icon : null;
          const damageStatusColor = getDamageStatusConfig(damageStatus).color;
          const damageStatusBg = getDamageStatusConfig(damageStatus).bg;

          return (
            <View style={{
              marginHorizontal: 20,
              marginBottom: 12,
              borderRadius: 20,
              backgroundColor: "white",
              borderWidth: 1.5,
              borderColor: hasDamage ? "#fecdd3" : "#d1fae5",
              shadowColor: hasDamage ? "#ef4444" : "#10b981",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
              overflow: "hidden",
            }}>
              {/* COLOR ACCENT BAR */}
              <View style={{
                height: 4,
                backgroundColor: hasDamage ? "#ef4444" : "#10b981",
              }} />

              <View style={{ padding: 18 }}>
                {/* TOP ROW */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    {/* ICON CIRCLE */}
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      backgroundColor: hasDamage ? "#fff1f2" : "#ecfdf5",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      {hasDamage ? (
                        <AlertTriangle size={24} color="#ef4444" strokeWidth={1.8} />
                      ) : (
                        <CheckCheck size={24} color="#10b981" strokeWidth={1.8} />
                      )}
                    </View>

                    <View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Home size={14} color="#9ca3af" />
                        <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827", letterSpacing: -0.3 }}>
                          Room {roomNumber}
                        </Text>
                      </View>
                      {item.room_type && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                          <DoorOpen size={11} color="#9ca3af" />
                          <Text style={{ fontSize: 12, color: "#9ca3af" }}>
                            {item.room_type}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* STATUS BADGE */}
                  <View style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: hasDamage ? "#fee2e2" : "#d1fae5",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}>
                    {hasDamage ? (
                      <CircleAlert size={12} color="#991b1b" />
                    ) : (
                      <CircleCheck size={12} color="#065f46" />
                    )}
                    <Text style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: hasDamage ? "#991b1b" : "#065f46",
                    }}>
                      {hasDamage ? "Damage Found" : "Cleaned"}
                    </Text>
                  </View>
                </View>

                {/* DIVIDER */}
                <View style={{ height: 1, backgroundColor: "#f3f4f6", marginBottom: 12 }} />

                {/* DATE + TIME */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: hasDamage ? 12 : 0 }}>
                  <Calendar size={14} color="#9ca3af" />
                  <Text style={{ fontSize: 13, color: "#6b7280", fontWeight: "500" }}>
                    {date}
                    {time ? ` at ${time}` : ""}
                  </Text>
                </View>

                {/* DAMAGE DETAIL */}
                {hasDamage && damageNote && (
                  <View style={{
                    backgroundColor: "#fff1f2",
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: "#fecdd3",
                    marginTop: 4,
                  }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <ShieldAlert size={14} color="#dc2626" />
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#dc2626", textTransform: "uppercase", letterSpacing: 0.5 }}>
                          {damageType || "Damage"} Report
                        </Text>
                      </View>
                      {damageStatus && DamageStatusIcon && (
                        <View style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 12,
                          backgroundColor: damageStatusBg,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}>
                          <DamageStatusIcon size={10} color={damageStatusColor} />
                          <Text style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: damageStatusColor,
                            textTransform: "capitalize",
                          }}>
                            {damageStatus}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, color: "#374151", lineHeight: 18 }}>
                      {damageNote}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const SummaryBox = ({ label, value, color, bg, icon: Icon }: any) => (
  <View style={{ 
    flex: 1, 
    backgroundColor: bg, 
    borderRadius: 16, 
    padding: 12, 
    alignItems: "center",
    gap: 6,
  }}>
    <Icon size={20} color={color} strokeWidth={1.8} />
    <Text style={{ fontSize: 22, fontWeight: "800", color, letterSpacing: -0.5 }}>{value}</Text>
    <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600", textAlign: "center" }}>{label}</Text>
  </View>
);