import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import api, { getImageUrl } from "@/services/api";

const STATUS_CONFIG = {
  pending: {
    bg: "rgba(217,119,6,0.85)",
    text: "#fff",
    dot: "#fff",
    label: "Pending",
  },
  checked_in: {
    bg: "rgba(37,99,235,0.85)",
    text: "#fff",
    dot: "#fff",
    label: "Checked In",
  },
  checked_out: {
    bg: "rgba(22,163,74,0.85)",
    text: "#fff",
    dot: "#fff",
    label: "Checked Out",
  },
  cancelled: {
    bg: "rgba(220,38,38,0.85)",
    text: "#fff",
    dot: "#fff",
    label: "Cancelled",
  },
};

export default function Bookings() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"active" | "history">("active");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const fetchBookings = async (currentPage = 1) => {
    try {

      if (data.length === 0) {
        setLoading(true);
      } else {
        setContentLoading(true);
      }

      const endpoint =
        filter === "history"
          ? `/bookings/history?page=${currentPage}&per_page=10`
          : "/bookings";

      const res = await api.get(endpoint);

      if (filter === "history") {
        setData(res.data.data);
        setLastPage(res.data.last_page);
      } else {
        setData(res.data);
      }

    } catch (e: any) {
      console.log("❌ FETCH ERROR:", e?.response || e);
    } finally {
      setLoading(false);
      setContentLoading(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchBookings(page);
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings(page);
  }, [filter, page]);

  const filteredData = data.filter((item) => {
    if (filter === "active") {
      return !["checked_out", "cancelled"].includes(item.booking_status);
    }
    return ["checked_out", "cancelled"].includes(item.booking_status);
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(price);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#faf8f3]">
        <View className="w-16 h-16 rounded-full border border-[#1a4a35]/20 justify-center items-center mb-5">
          <ActivityIndicator size="large" color="#1a4a35" />
        </View>
        <Text
          className="text-[#1a4a35] text-base tracking-widest uppercase"
          style={{ fontFamily: "Georgia" }}
        >
          Loading bookings
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#faf8f3]">
      <StatusBar barStyle="light-content" translucent />

      {/* ── HEADER ── */}
      <LinearGradient
        colors={["#0d2e1f", "#1a4a35"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 28,
          paddingHorizontal: 24,
        }}
      >
        {/* Decorative circles */}
        <View
          className="absolute rounded-full border border-white/5"
          style={{ width: 240, height: 240, top: -60, right: -60 }}
        />
        <View
          className="absolute rounded-full border border-white/5"
          style={{ width: 140, height: 140, top: -10, right: -10 }}
        />

        {/* Title row */}
        <View className="flex-row justify-between items-start mb-6">
          <View>
            <Text className="text-[#c9a96e] text-[10px] tracking-[4px] uppercase mb-1">
              Lyn Enia's Inn
            </Text>
            <Text
              className="text-white text-4xl"
              style={{ fontFamily: "Georgia" }}
            >
              My Bookings
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => fetchBookings(page)}
            activeOpacity={0.7}
            className="w-9 h-9 rounded-full bg-white/10 border border-white/10 justify-center items-center mt-1"
          >
            <Ionicons name="refresh-outline" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Filter tabs */}
        <View className="flex-row bg-white/10 rounded-2xl p-1 border border-white/10">
          {(["active", "history"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => {
                setPage(1);
                setFilter(tab);
              }}
              activeOpacity={0.8}
              className="flex-1 rounded-xl py-2.5 items-center"
              style={{
                backgroundColor: filter === tab ? "#fff" : "transparent",
              }}
            >
              <Text
                className="text-sm tracking-wide"
                style={{
                  color: filter === tab ? "#1a4a35" : "rgba(255,255,255,0.5)",
                  fontFamily: "Georgia",
                }}
              >
                {tab === "active" ? "Active" : "History"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* ── LIST ── */}
      {contentLoading && (
        <View className="absolute top-[220px] left-0 right-0 z-50 items-center">
          <View className="bg-white px-4 py-2 rounded-full shadow">
            <ActivityIndicator size="small" color="#1a4a35" />
          </View>
        </View>
      )}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1a4a35"]}
            tintColor="#1a4a35"
          />


        }
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 120 + insets.bottom,
          gap: 16,
        }}
        ListEmptyComponent={
          <View className="items-center justify-center py-24 px-8">
            <View className="w-20 h-20 rounded-full bg-[#1a4a35]/06 border border-[#1a4a35]/10 justify-center items-center mb-5">
              <Ionicons
                name={filter === "active" ? "calendar-outline" : "time-outline"}
                size={32}
                color="#1a4a35"
                style={{ opacity: 0.4 }}
              />
            </View>
            <Text
              className="text-[#1a4a35] text-lg mb-2"
              style={{ fontFamily: "Georgia" }}
            >
              {filter === "active" ? "No active bookings" : "No booking history"}
            </Text>
            <Text className="text-[#1a4a35]/40 text-sm text-center leading-5">
              {filter === "active"
                ? "Your active bookings will appear here"
                : "Your past bookings will appear here"}
            </Text>
          </View>
        }

        renderItem={({ item }) => {
          const room =
            item.booked_rooms?.[0]?.room ||
            item.rooms?.[0];
          console.log("ROOM DATA:", JSON.stringify(room, null, 2));

          const normalImage = room?.image_url
            ? `${room.image_url}?t=${new Date().getTime()}`
            : null;

          const statusKey = item.booking_status?.toLowerCase().replace("-", "_");

          const s =
            STATUS_CONFIG[statusKey as keyof typeof STATUS_CONFIG] ?? {
              bg: "rgba(0,0,0,0.45)",
              text: "#fff",
              dot: "#fff",
              label: item.booking_status,
            };

          const nights = (() => {
            if (!item.check_in_date || !item.check_out_date) return null;
            const diff =
              (new Date(item.check_out_date).getTime() -
                new Date(item.check_in_date).getTime()) /
              (1000 * 60 * 60 * 24);
            return Math.round(diff);
          })();

          return (
            <View
              className="bg-white rounded-3xl overflow-hidden"
              style={{
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 3, // Android
              }}
            >
              {/* Room image */}
              <View className="relative">
                <Image
                  source={{
                    uri:
                      normalImage ||
                      "https://picsum.photos/seed/booking/400/250",
                  }}
                  style={{ width: "100%", height: 180 }}
                />

                {/* Gradient overlay */}
                <LinearGradient
                  colors={["transparent", "rgba(13,46,31,0.85)"]}
                  className="absolute bottom-0 left-0 right-0 h-24"
                />

                {/* Status pill on image */}
                <View
                  className="absolute top-4 left-4 flex-row items-center gap-1.5 px-3 py-1 rounded-full"
                  style={{ backgroundColor: s.bg }}
                >
                  <View
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: s.dot }}
                  />
                  <Text
                    className="text-[10px] tracking-widest uppercase font-medium"
                    style={{ color: s.text }}
                  >
                    {s.label}
                  </Text>
                </View>

                {/* Room number on image */}
                <View className="absolute bottom-4 left-4 right-4 flex-row justify-between items-end">
                  <View>
                    <Text className="text-white/60 text-[10px] tracking-widest uppercase mb-0.5">
                      Room
                    </Text>
                    <Text
                      className="text-white text-3xl"
                      style={{ fontFamily: "Georgia" }}
                    >
                      {room?.room_number ?? "N/A"}
                    </Text>
                  </View>
                  <Text
                    className="text-[#c9a96e] text-xl"
                    style={{ fontFamily: "Georgia" }}
                  >
                    {formatPrice(item.total_price)}
                  </Text>
                </View>
              </View>

              {/* Card body */}
              <View className="px-5 py-4">
                {/* Dates row */}
                <View className="flex-row items-center gap-3 mb-4">
                  {/* Check-in */}
                  <View className="flex-1">
                    <Text className="text-[#1a4a35]/40 text-[10px] tracking-widest uppercase mb-1">
                      Check-in
                    </Text>
                    <Text className="text-[#1a4a35] text-sm font-medium">
                      {formatDate(item.check_in_date)}
                    </Text>
                  </View>

                  {/* Nights badge */}
                  {nights !== null && (
                    <View className="items-center px-3">
                      <View className="w-px h-3 bg-[#1a4a35]/15" />
                      <View className="bg-[#1a4a35]/06 rounded-full px-2.5 py-1 my-1">
                        <Text className="text-[#1a4a35] text-[10px] tracking-wide">
                          {nights}n
                        </Text>
                      </View>
                      <View className="w-px h-3 bg-[#1a4a35]/15" />
                    </View>
                  )}

                  {/* Check-out */}
                  <View className="flex-1 items-end">
                    <Text className="text-[#1a4a35]/40 text-[10px] tracking-widest uppercase mb-1">
                      Check-out
                    </Text>
                    <Text className="text-[#1a4a35] text-sm font-medium">
                      {formatDate(item.check_out_date)}
                    </Text>
                  </View>
                </View>

                <View className="h-px bg-[#1a4a35]/06 mb-4" />

                {/* View details CTA */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  className="rounded-xl overflow-hidden"
                >
                  <LinearGradient
                    colors={["#1a4a35", "#0d2e1f"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="flex-row items-center justify-center py-3 gap-2"
                  >
                    <Text
                      className="text-white text-xs tracking-widest uppercase"
                      style={{ fontFamily: "Georgia" }}
                    >
                      View Details
                    </Text>
                    <Ionicons name="arrow-forward" size={13} color="#c9a96e" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
      {/* {filter === "history" && (
        <View className="flex-row justify-center items-center gap-4 pb-10">

          <TouchableOpacity
            disabled={page === 1}
            onPress={() => setPage((p) => p - 1)}
            className={`px-4 py-2 rounded-xl ${page === 1 ? "bg-gray-300" : "bg-[#1a4a35]"
              }`}
          >
            <Text className="text-white">Previous</Text>
          </TouchableOpacity>

          <Text className="text-[#1a4a35] font-semibold">
            {page} / {lastPage}
          </Text>

          <TouchableOpacity
            disabled={page === lastPage}
            onPress={() => setPage((p) => p + 1)}
            className={`px-4 py-2 rounded-xl ${page === lastPage ? "bg-gray-300" : "bg-[#1a4a35]"
              }`}
          >
            <Text className="text-white">Next</Text>
          </TouchableOpacity>

        </View>
      )} */}
    </View>
  );
}