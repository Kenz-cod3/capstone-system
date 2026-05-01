import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "expo-router";
import { getRooms } from "@/services/roomService";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import api from "@/services/api";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 56;

const STATUS_CONFIG: Record<string, { bg: string; dot: string; label: string }> = {
  available: { bg: "rgba(22,163,74,0.85)", dot: "#fff", label: "Available" },
  occupied: { bg: "rgba(37,99,235,0.85)", dot: "#fff", label: "Occupied" },
  maintenance: { bg: "rgba(220,38,38,0.85)", dot: "#fff", label: "Maintenance" },
};

export default function Home() {
  const { user, token, isLoaded } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [groupedRooms, setGroupedRooms] = useState<any>({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false); // 👈 new
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) router.replace("/auth/login");
  }, [user, isLoaded]);

  useEffect(() => {
    if (!isLoaded || !token) return;
    fetchRooms();
    if (user) {
      checkUnreadNotifications();
      checkUnreadMessages(); // 👈 new
    }
  }, [isLoaded, token, user]);

  const checkUnreadNotifications = async () => {
    try {
      const res = await api.get(`/notifications/user/${user?.id}`);
      const result = res.data?.data || res.data;
      const notifications = Array.isArray(result) ? result : [];
      setHasUnreadNotifications(notifications.some((n: any) => !n.is_read));
    } catch (e) {
      console.log("Error checking notifications:", e);
    }
  };

  // 👇 Check for unread messages sent TO this user
  const checkUnreadMessages = async () => {
    try {
      const res = await api.get(`/messages/user/${user?.id}`);

      const messages = res.data?.data ?? res.data ?? [];

      const hasUnread = messages.some(
        (m: any) =>
          !m.is_read &&
          m.message?.sender_id !== user?.id
      );

      setHasUnreadMessages(hasUnread);
    } catch (e) {
      console.log("Unread check error:", e);
    }
  };

  useEffect(() => {
    if (!user) return;

    checkUnreadMessages(); // initial

    const interval = setInterval(() => {
      checkUnreadMessages();
    }, 3000); // every 3 seconds

    return () => clearInterval(interval);
  }, [user]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await getRooms();
      const result = res?.data || res;
      const data = Array.isArray(result) ? result : [];
      setAllRooms(data);
    } catch (e) {
      setAllRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const filtered = allRooms.filter((room) =>
      room.room_number.toString().includes(debouncedSearch)
    );
    const grouped: any = {};
    filtered.forEach((room) => {
      const type = room.room_type?.type_name || "Others";
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(room);
    });
    setGroupedRooms(grouped);
  }, [debouncedSearch, allRooms]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(price);

  const getRoomTypeIcon = (type: string) => {
    const icons: any = {
      Standard: "bed-outline",
      Deluxe: "star-outline",
      Suite: "diamond-outline",
      Family: "people-outline",
      Others: "home-outline",
    };
    return icons[type] || "bed-outline";
  };

  const navigateToRoom = (item: any) => {
    if (isNavigating) return;
    setIsNavigating(true);
    router.push({ pathname: "/bookings/details", params: { room: JSON.stringify(item) } });
    setTimeout(() => setIsNavigating(false), 500);
  };

  if (!isLoaded || loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#faf8f3]">
        <View className="w-16 h-16 rounded-full border border-[#1a4a35]/20 justify-center items-center mb-5">
          <ActivityIndicator size="large" color="#1a4a35" />
        </View>
        <Text
          className="text-[#1a4a35] text-base tracking-widest uppercase"
          style={{ fontFamily: "Georgia" }}
        >
          Preparing your stay
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#faf8f3]">
      <StatusBar barStyle="light-content" translucent />

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {/* ── HERO ── */}
        <View style={{ height: 280 }}>
          <LinearGradient
            colors={["#0d2e1f", "#1a4a35", "#0d2e1f"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: "absolute", inset: 0 }}
          />

          {/* Decorative circles */}
          <View
            className="absolute rounded-full border border-white/5"
            style={{ width: 320, height: 320, top: -80, right: -80 }}
          />
          <View
            className="absolute rounded-full border border-white/5"
            style={{ width: 200, height: 200, top: -20, right: -20 }}
          />

          <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 24 }}>
            {/* Top row */}
            <View className="flex-row justify-between items-center mb-8">
              {/* Monogram */}
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-[#c9a96e]/20 border border-[#c9a96e]/40 justify-center items-center">
                  <Text
                    className="text-[#c9a96e] text-xs font-bold"
                    style={{ fontFamily: "Georgia" }}
                  >
                    L
                  </Text>
                </View>
                <Text className="text-white/50 text-xs tracking-widest uppercase">
                  Inn
                </Text>
              </View>

              {/* Action icons */}
              <View className="flex-row gap-3">

                {/* 💬 Chat icon with red dot if unread */}
                <TouchableOpacity
                  onPress={() => {
                    setHasUnreadMessages(false);
                    router.push("/chat/1");
                  }}
                  activeOpacity={0.7}
                  className="w-9 h-9 rounded-full bg-white/10 border border-white/10 justify-center items-center"
                >
                  <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                  {hasUnreadMessages && (
                    <View className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#1a4a35]" />
                  )}
                </TouchableOpacity>

                {/* 🔔 Notification icon with gold dot if unread */}
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await api.put(`/notifications/user/${user?.id}/read-all`);
                      setHasUnreadNotifications(false);
                      router.push("/notifications/notification");
                    } catch (e) {
                      console.log("Error marking notifications as read:", e);
                    }
                  }}
                  activeOpacity={0.7}
                  className="w-9 h-9 rounded-full bg-white/10 border border-white/10 justify-center items-center"
                >
                  <Ionicons name="notifications-outline" size={16} color="#fff" />
                  {hasUnreadNotifications && (
                    <View className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push("/bookings/multiple")}
                  activeOpacity={0.7}
                  className="w-9 h-9 rounded-full bg-[#c9a96e] justify-center items-center"
                >
                  <Ionicons name="calendar-outline" size={18} color="#1a4a35" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Welcome copy */}
            <Text className="text-[#c9a96e] text-xs tracking-[4px] uppercase mb-2">
              Welcome back
            </Text>
            <Text
              className="text-white text-4xl leading-tight mb-1"
              style={{ fontFamily: "Georgia" }}
            >
              {user?.first_name || "Guest"}
            </Text>
            <Text
              className="text-white/40 text-sm tracking-wide mb-8"
              style={{ fontFamily: "Georgia", fontStyle: "italic" }}
            >
              Lyn Enia's Travelers' Inn
            </Text>

            {/* Search */}
            <BlurView
              intensity={20}
              tint="dark"
              className="rounded-2xl overflow-hidden border border-white/10"
            >
              <View className="flex-row items-center px-4 py-3 gap-3">
                <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.4)" />
                <TextInput
                  placeholder="Search by room number..."
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  className="flex-1 text-white text-sm"
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                )}
              </View>
            </BlurView>
          </View>
        </View>

        {/* ── ROOMS ── */}
        <View className="pt-8">
          {Object.keys(groupedRooms).length === 0 && !loading && (
            <View className="items-center justify-center py-20 px-8">
              <View className="w-20 h-20 rounded-full bg-[#1a4a35]/08 border border-[#1a4a35]/10 justify-center items-center mb-5">
                <Ionicons name="bed-outline" size={32} color="#1a4a35" />
              </View>
              <Text
                className="text-[#1a4a35] text-lg mb-2"
                style={{ fontFamily: "Georgia" }}
              >
                No rooms found
              </Text>
              <Text className="text-[#1a4a35]/40 text-sm text-center leading-5">
                Try a different room number
              </Text>
            </View>
          )}

          {Object.keys(groupedRooms).map((type) => (
            <View key={type} className="mb-10">
              {/* Section header */}
              <View className="flex-row items-center justify-between px-6 mb-5">
                <View className="flex-row items-center gap-3">
                  <View className="w-7 h-7 rounded-full bg-[#1a4a35]/10 justify-center items-center">
                    <Ionicons name={getRoomTypeIcon(type)} size={14} color="#1a4a35" />
                  </View>
                  <Text
                    className="text-[#1a4a35] text-xl"
                    style={{ fontFamily: "Georgia" }}
                  >
                    {type}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className="w-1 h-1 rounded-full bg-[#c9a96e]" />
                  <Text className="text-[#c9a96e] text-xs tracking-widest uppercase">
                    {groupedRooms[type].length} rooms
                  </Text>
                </View>
              </View>

              {/* Cards */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={CARD_WIDTH + 16}
                snapToAlignment="start"
                contentContainerStyle={{ paddingHorizontal: 24 }}
              >
                {groupedRooms[type].map((item: any, idx: number) => {
                  const s = STATUS_CONFIG[item.status] ?? {
                    bg: "rgba(0,0,0,0.45)",
                    dot: "#9ca3af",
                    label: item.status,
                  };

                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.95}
                      onPress={() => navigateToRoom(item)}
                      style={{
                        width: CARD_WIDTH,
                        marginRight: idx === groupedRooms[type].length - 1 ? 0 : 16,
                        marginBottom: 10,
                        shadowColor: "#000",
                        shadowOpacity: 0.06,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 4,
                      }}
                      className="rounded-3xl overflow-hidden bg-white"
                    >
                      {/* Image */}
                      <View className="relative">
                        <Image
                          source={{
                            uri: item.image_url || "https://picsum.photos/seed/room/400/300",
                          }}
                          style={{ width: "100%", height: 210 }}
                          className="bg-[#e8e4d9]"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(13,46,31,0.85)"]}
                          className="absolute bottom-0 left-0 right-0 h-28"
                        />

                        {/* Status pill */}
                        <View
                          className="absolute top-4 left-4 flex-row items-center gap-1.5 px-3 py-1 rounded-full"
                          style={{ backgroundColor: s.bg }}
                        >
                          <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
                          <Text className="text-white text-[10px] tracking-widest uppercase font-medium">
                            {s.label}
                          </Text>
                        </View>

                        {/* Price on image */}
                        <View className="absolute bottom-4 left-4 right-4 flex-row justify-between items-end">
                          <View>
                            <Text className="text-white/60 text-[10px] tracking-widest uppercase mb-0.5">
                              Room
                            </Text>
                            <Text
                              className="text-white text-3xl font-bold"
                              style={{ fontFamily: "Georgia" }}
                            >
                              {item.room_number}
                            </Text>
                          </View>
                          <View className="items-end">
                            <Text
                              className="text-[#c9a96e] text-xl font-bold"
                              style={{ fontFamily: "Georgia" }}
                            >
                              {formatPrice(item.room_type?.base_price)}
                            </Text>
                            <Text className="text-white/50 text-[10px] tracking-wide">
                              per night
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Card body */}
                      <View className="px-5 py-4 bg-white">
                        <View className="flex-row items-center gap-5 mb-4">
                          <View className="flex-row items-center gap-1.5">
                            <Ionicons name="people-outline" size={13} color="#1a4a35" />
                            <Text className="text-[#1a4a35]/60 text-xs">
                              {item.room_type?.capacity || 2} guests
                            </Text>
                          </View>
                          <View className="w-px h-3 bg-[#1a4a35]/15" />
                          <View className="flex-row items-center gap-1.5">
                            <Ionicons name="resize-outline" size={13} color="#1a4a35" />
                            <Text className="text-[#1a4a35]/60 text-xs">
                              {item.room_type?.size || 25} m²
                            </Text>
                          </View>
                          <View className="w-px h-3 bg-[#1a4a35]/15" />
                          <View className="flex-row items-center gap-1.5">
                            <Ionicons name="star-outline" size={13} color="#c9a96e" />
                            <Text className="text-[#1a4a35]/60 text-xs">{type}</Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => navigateToRoom(item)}
                          className="rounded-2xl overflow-hidden"
                        >
                          <LinearGradient
                            colors={["#1a4a35", "#0d2e1f"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            className="flex-row items-center justify-center py-3.5 gap-2"
                          >
                            <Text
                              className="text-white text-sm tracking-widest uppercase"
                              style={{ fontFamily: "Georgia" }}
                            >
                              Reserve Room
                            </Text>
                            <Ionicons name="arrow-forward" size={14} color="#c9a96e" />
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}