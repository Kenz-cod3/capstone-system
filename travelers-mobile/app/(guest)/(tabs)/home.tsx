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
  RefreshControl,
  BackHandler,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState, useRef, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getRooms } from "@/services/roomService";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import api from "@/services/api";
import { useLocalSearchParams } from "expo-router";

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
  const [refreshing, setRefreshing] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const params = useLocalSearchParams();

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        Alert.alert(
          "Exit App",
          "Are you sure you want to exit the app?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Exit", onPress: () => BackHandler.exitApp() },
          ]
        );
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );

      return () => backHandler.remove();
    }, [])
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) router.replace("/auth/login");
  }, [user, isLoaded]);

  useEffect(() => {
    if (!isLoaded || !token) return;
    fetchRooms();
    if (user) {
      checkUnreadNotifications();
      checkUnreadMessages();
    }
  }, [isLoaded, token, user]);

  const checkUnreadNotifications = async () => {
    try {
      const res = await api.get(
        `/notifications/user/${user?.id}/unread-count`
      );

      setUnreadNotificationCount(res.data.count ?? 0);
    } catch (e) {
      console.log("Error checking notifications:", e);
    }
  };

  const checkUnreadMessages = async () => {
    try {
      const res = await api.get(`/messages/user/${user?.id}`);
      const messages = res.data?.data ?? res.data ?? [];
      const hasUnread = messages.some(
        (m: any) => !m.is_read && m.message?.sender_id !== user?.id
      );
      setHasUnreadMessages(hasUnread);
    } catch (e) {
      console.log("Unread check error:", e);
    }
  };

  useEffect(() => {
    if (!user) return;
    checkUnreadMessages();
    const interval = setInterval(() => {
      checkUnreadMessages();
    }, 3000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    checkUnreadNotifications();

    const interval = setInterval(() => {
      checkUnreadNotifications();
    }, 3000);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchRooms(),
        user && checkUnreadNotifications(),
        user && checkUnreadMessages(),
      ]);
    } catch (error) {
      console.log("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

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
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
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
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#c9a96e"
            colors={["#c9a96e"]}
            progressBackgroundColor="#ffffff"
          />
        }
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
                  YN
                </Text>
              </View>

              {/* Action icons */}
              <View className="flex-row gap-3">
                {/* Chat */}
                <TouchableOpacity
                  onPress={() => {
                    if (isNavigating) return;
                    setIsNavigating(true);
                    setHasUnreadMessages(false);
                    router.push("/chat/1");
                    setTimeout(() => setIsNavigating(false), 1000);
                  }}
                  activeOpacity={0.7}
                  className="w-9 h-9 rounded-full bg-white/10 border border-white/10 justify-center items-center"
                >
                  <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                  {hasUnreadMessages && (
                    <View className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#1a4a35]" />
                  )}
                </TouchableOpacity>

                {/* Notifications */}
                <TouchableOpacity
                  onPress={() => {
                    router.push("/notifications/notification");
                  }}
                  activeOpacity={0.7}
                  className="w-9 h-9 rounded-full bg-white/10 border border-white/10 justify-center items-center"
                >
                  <Ionicons
                    name="notifications-outline"
                    size={16}
                    color="#fff"
                  />

                  {unreadNotificationCount > 0 && (
                    <View
                      style={{
                        position: "absolute",
                        top: -5,
                        right: -5,
                        minWidth: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: "#ef4444",
                        justifyContent: "center",
                        alignItems: "center",
                        paddingHorizontal: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: "bold",
                        }}
                      >
                        {unreadNotificationCount > 99
                          ? "99+"
                          : unreadNotificationCount}
                      </Text>
                    </View>
                  )}
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

                        {/* Price + room number on image */}
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
                              {/* max_occupancy is the correct DB column */}
                              {item.room_type?.max_occupancy || 2} guests
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

      {/* ── FLOATING BUTTON FOR MULTIPLE BOOKINGS ── */}
      <TouchableOpacity
        onPress={() => router.push("/bookings/multiple")}
        activeOpacity={0.85}
        style={{
          position: "absolute",
          bottom: insets.bottom + 20,
          right: 20,
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <LinearGradient
          colors={["#1a4a35", "#0d2e1f"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons name="layers-outline" size={28} color="#c9a96e" />
        </LinearGradient>
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            backgroundColor: "#c9a96e",
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ color: "#1a4a35", fontSize: 10, fontWeight: "bold" }}>
            2+
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}