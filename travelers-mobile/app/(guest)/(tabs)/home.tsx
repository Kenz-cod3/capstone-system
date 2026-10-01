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
  InteractionManager,
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
import { registerForPushNotificationsAsync } from "@/services/notifications";

const { width } = Dimensions.get("window");

const CARD_WIDTH = width - 56;

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

  // =====================================================
  // ANDROID BACK BUTTON
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        Alert.alert("Exit App", "Are you sure you want to exit the app?", [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Exit",
            onPress: () => BackHandler.exitApp(),
          },
        ]);

        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction,
      );

      return () => backHandler.remove();
    }, []),
  );

  // =====================================================
  // AUTH
  // =====================================================

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.replace("/auth/login");
    }
  }, [user, isLoaded]);

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    if (!isLoaded || !token) return;

    fetchRooms();

    if (user) {
      checkUnreadNotifications();
      checkUnreadMessages();
    }
  }, [isLoaded, token, user]);

  // =====================================================
  // REGISTER PUSH NOTIFICATIONS
  // =====================================================

  useEffect(() => {
    if (!isLoaded || !user) return;

    const registerPushNotifications = async () => {
      try {
        const pushToken = await registerForPushNotificationsAsync();

        if (pushToken) {
          console.log("Guest Expo Push Token:", pushToken);

          try {
            await api.post("/guest/push-token", {
              expo_push_token: pushToken,
            });

            console.log("Guest push token saved to Laravel.");
          } catch (error) {
            console.log("Failed to save guest push token:", error);
          }
        }
      } catch (error) {
        console.log("Push notification registration error:", error);
      }
    };

    const task = InteractionManager.runAfterInteractions(() => {
      registerPushNotifications();
    });

    return () => task.cancel();
  }, [isLoaded, user]);

  // =====================================================
  // CHECK UNREAD NOTIFICATIONS
  // =====================================================

  const checkUnreadNotifications = async () => {
    try {
      const res = await api.get(`/notifications/user/${user?.id}/unread-count`);

      setUnreadNotificationCount(res.data.count ?? 0);
    } catch (e) {
      console.log("Error checking notifications:", e);
    }
  };

  // =====================================================
  // CHECK UNREAD MESSAGES
  // =====================================================

  const checkUnreadMessages = async () => {
    try {
      const res = await api.get(`/messages/user/${user?.id}`);

      const messages = res.data?.data ?? res.data ?? [];

      const hasUnread = messages.some(
        (m: any) => !m.is_read && m.message?.sender_id !== user?.id,
      );

      setHasUnreadMessages(hasUnread);
    } catch (e) {
      console.log("Unread check error:", e);
    }
  };

  // =====================================================
  // MESSAGE POLLING
  // =====================================================

  useEffect(() => {
    if (!user) return;

    checkUnreadMessages();

    const interval = setInterval(() => {
      checkUnreadMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [user]);

  // =====================================================
  // NOTIFICATION POLLING
  // =====================================================

  useEffect(() => {
    if (!user) return;

    checkUnreadNotifications();

    const interval = setInterval(() => {
      checkUnreadNotifications();
    }, 3000);

    return () => clearInterval(interval);
  }, [user]);

  // =====================================================
  // FETCH ROOMS
  // =====================================================

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

  // =====================================================
  // REFRESH
  // =====================================================

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

  // =====================================================
  // DEBOUNCE SEARCH
  // =====================================================

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);

    return () => clearTimeout(timer);
  }, [search]);

  // =====================================================
  // SEARCH / GROUP ROOMS
  // ✅ Ipakita LAHAT maliban sa maintenance
  // =====================================================

  useEffect(() => {
    const searchTerm = debouncedSearch.trim().toLowerCase();

    const filtered = allRooms.filter((room) => {
      const status = String(room.status || "").toLowerCase();

      // ✅ Hindi lang maintenance — kasi ang guest ay nag-book for future dates
      const isBookable = status !== "maintenance";

      const roomNumber = String(room.room_number ?? "").toLowerCase();

      const roomTypeName = String(
        room.room_type?.type_name ?? "",
      ).toLowerCase();

      const matchesSearch =
        searchTerm === "" ||
        roomNumber.includes(searchTerm) ||
        roomTypeName.includes(searchTerm);

      return isBookable && matchesSearch;
    });

    const grouped: any = {};

    filtered.forEach((room) => {
      const type = room.room_type?.type_name || "Others";

      if (!grouped[type]) {
        grouped[type] = [];
      }

      grouped[type].push(room);
    });

    setGroupedRooms(grouped);
  }, [debouncedSearch, allRooms]);

  // =====================================================
  // FORMAT PRICE
  // =====================================================

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(price);

  // =====================================================
  // GREETING
  // =====================================================

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 18) {
      return "Good afternoon";
    }

    return "Good evening";
  };

  // =====================================================
  // DATE
  // =====================================================

  const getTodayDate = () => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date());
  };

  // =====================================================
  // ROOM TYPE ICON
  // =====================================================

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

  // =====================================================
  // NAVIGATE TO ROOM
  // =====================================================

  const navigateToRoom = (item: any) => {
    if (isNavigating) return;

    setIsNavigating(true);

    router.push({
      pathname: "/bookings/details",
      params: {
        room: JSON.stringify(item),
      },
    });

    setTimeout(() => {
      setIsNavigating(false);
    }, 500);
  };

  // =====================================================
  // LOADING SCREEN
  // =====================================================

  if (!isLoaded || loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#faf8f3]">
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />

        <View className="w-16 h-16 rounded-full border border-[#1a4a35]/20 justify-center items-center mb-5">
          <ActivityIndicator size="large" color="#1a4a35" />
        </View>

        <Text
          className="text-[#1a4a35] text-base tracking-widest uppercase"
          style={{
            fontFamily: "Georgia",
          }}
        >
          Preparing your stay
        </Text>
      </View>
    );
  }

  // =====================================================
  // MAIN
  // =====================================================

  return (
    <View className="flex-1 bg-[#faf8f3]">
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 100 + insets.bottom,
        }}
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
        {/* HERO / HEADER */}
        <View
          style={{
            width: "100%",
            minHeight: 280,
            borderBottomLeftRadius: 25,
            borderBottomRightRadius: 25,
            overflow: "hidden",
          }}
        >
          <LinearGradient
            colors={["#0d2e1f", "#1a4a35", "#0d2e1f"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />

          <View
            className="absolute rounded-full border border-white/5"
            style={{ width: 320, height: 320, top: -80, right: -80 }}
          />

          <View
            className="absolute rounded-full border border-white/5"
            style={{ width: 200, height: 200, top: -20, right: -20 }}
          />

          <View
            style={{
              width: "100%",
              paddingTop: insets.top + 16,
              paddingHorizontal: width < 360 ? 16 : 24,
              paddingBottom: 22,
            }}
          >
            {/* TOP ROW */}
            <View className="flex-row justify-between items-center mb-7">
              <View className="flex-row items-center gap-1">
                <View className="w-8 h-8 rounded-full bg-[#c9a96e]/20 border border-[#c9a96e]/40 justify-center items-center">
                  <Text
                    className="text-[#c9a96e] text-xs font-bold"
                    style={{ fontFamily: "Georgia" }}
                  >
                    {user?.first_name?.charAt(0)?.toUpperCase() || "G"}
                  </Text>
                </View>

                <Text
                  className="text-white/50 text-xs tracking-widest uppercase"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{ maxWidth: width < 360 ? 100 : 180 }}
                >
                  {user?.first_name?.slice(1) || "uest"}
                </Text>
              </View>

              <View className="flex-row">
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

            {/* WELCOME BACK */}
            <Text
              className="text-[#c9a96e] uppercase"
              style={{
                fontSize: width < 360 ? 9 : 10,
                letterSpacing: width < 360 ? 3 : 4,
                marginBottom: 7,
                fontWeight: "600",
              }}
            >
              Welcome back
            </Text>

            {/* GREETING */}
            <Text
              className="text-white"
              style={{
                fontFamily: "Georgia",
                fontSize: width < 360 ? 23 : 25,
                lineHeight: width < 360 ? 29 : 34,
                fontWeight: "500",
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {getGreeting()},
            </Text>

            {/* USER NAME */}
            <Text
              className="text-[#c9a96e]"
              style={{
                fontFamily: "Georgia",
                fontSize: width < 360 ? 29 : 33,
                lineHeight: width < 360 ? 34 : 39,
                fontWeight: "600",
                marginBottom: 10,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {user?.first_name || "Guest"}
            </Text>

            {/* DATE */}
            <View className="flex-row items-center" style={{ marginBottom: 4 }}>
              <Ionicons
                name="calendar-outline"
                size={width < 360 ? 12 : 13}
                color="rgba(255,255,255,0.55)"
                style={{ marginRight: 8 }}
              />

              <Text
                className="text-white/55"
                style={{
                  fontSize: width < 360 ? 10 : 11,
                  lineHeight: width < 360 ? 14 : 15,
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {getTodayDate()}
              </Text>
            </View>

            {/* INN NAME */}
            <View className="flex-row items-center" style={{ marginBottom: 3 }}>
              <Ionicons
                name="business-outline"
                size={width < 360 ? 12 : 13}
                color="rgba(255,255,255,0.45)"
                style={{ marginRight: 8 }}
              />

              <Text
                className="text-white/45"
                style={{
                  fontFamily: "Georgia",
                  fontStyle: "italic",
                  fontSize: width < 360 ? 10 : 11,
                  lineHeight: width < 360 ? 14 : 15,
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Lyn Enia's Travelers' Inn
              </Text>
            </View>

            {/* SEARCH BAR */}
            <View style={{ width: "100%", marginTop: 10 }}>
              <BlurView
                intensity={20}
                tint="dark"
                className="rounded-2xl overflow-hidden border border-white/10"
                style={{ width: "100%", minHeight: 50 }}
              >
                <View
                  style={{
                    width: "100%",
                    minHeight: 50,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: width < 360 ? 12 : 14,
                    paddingVertical: 5,
                  }}
                >
                  <Ionicons
                    name="search-outline"
                    size={18}
                    color="rgba(255,255,255,0.4)"
                  />

                  <TextInput
                    placeholder="Search room number or type..."
                    value={search}
                    onChangeText={setSearch}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      color: "#fff",
                      fontSize: width < 360 ? 13 : 14,
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                    }}
                    numberOfLines={1}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  {search.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearch("")}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color="rgba(255,255,255,0.4)"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </BlurView>
            </View>
          </View>
        </View>

        {/* ROOMS */}
        <View className="pt-8">
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <Text
              style={{
                fontFamily: "Georgia",
                fontSize: 25,
                color: "#1a4a35",
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              Available Rooms
            </Text>

            <View
              style={{
                width: 26,
                height: 2,
                backgroundColor: "#c9a96e",
              }}
            />
          </View>

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
                Try a different room number or room type
              </Text>
            </View>
          )}

          {Object.keys(groupedRooms).map((type) => (
            <View key={type} className="mb-10">
              <View
                className="flex-row items-center px-6 mb-5"
                style={{ width: "100%" }}
              >
                <View
                  className="flex-row items-center"
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <View className="w-7 h-7 rounded-full bg-[#1a4a35]/10 justify-center items-center mr-3">
                    <Ionicons
                      name={getRoomTypeIcon(type)}
                      size={14}
                      color="#1a4a35"
                    />
                  </View>

                  <Text
                    className="text-[#1a4a35] text-xl"
                    style={{ fontFamily: "Georgia", flexShrink: 1 }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {type}
                  </Text>
                </View>

                <View
                  className="flex-row items-center ml-3"
                  style={{ flexShrink: 0 }}
                >
                  <View className="w-1 h-1 rounded-full bg-[#c9a96e] mr-2" />

                  <Text
                    className="text-[#c9a96e] uppercase"
                    style={{
                      fontSize: width < 360 ? 9 : 10,
                      letterSpacing: 1.5,
                      flexShrink: 0,
                    }}
                    numberOfLines={1}
                  >
                    {groupedRooms[type].length}{" "}
                    {groupedRooms[type].length === 1 ? "ROOM" : "ROOMS"}
                  </Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={CARD_WIDTH + 16}
                snapToAlignment="start"
                contentContainerStyle={{ paddingHorizontal: 24 }}
              >
                {groupedRooms[type].map((item: any, idx: number) => {
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.95}
                      onPress={() => navigateToRoom(item)}
                      style={{
                        width: CARD_WIDTH,
                        marginRight:
                          idx === groupedRooms[type].length - 1 ? 0 : 16,
                        marginBottom: 10,
                        shadowColor: "#000",
                        shadowOpacity: 0.06,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 4,
                      }}
                      className="rounded-3xl overflow-hidden bg-white"
                    >
                      <View className="relative">
                        <Image
                          source={{
                            uri:
                              item.image_url ||
                              "https://picsum.photos/seed/room/400/300",
                          }}
                          style={{ width: "100%", height: 210 }}
                          className="bg-[#e8e4d9]"
                        />

                        <LinearGradient
                          colors={["transparent", "rgba(13,46,31,0.85)"]}
                          className="absolute bottom-0 left-0 right-0 h-28"
                        />

                        {/* ✅ LAGING "AVAILABLE" BADGE */}
                        <View
                          className="absolute top-4 left-4 flex-row items-center gap-1.5 px-3 py-1 rounded-full"
                          style={{ backgroundColor: "rgba(22,163,74,0.85)" }}
                        >
                          <View
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: "#fff" }}
                          />

                          <Text className="text-white text-[10px] tracking-widest uppercase font-medium">
                            Available
                          </Text>
                        </View>

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

                          <View
                            className="items-end"
                            style={{ flexShrink: 0, minWidth: 85 }}
                          >
                            <Text
                              className="text-[#c9a96e] font-bold"
                              style={{
                                fontFamily: "Georgia",
                                fontSize: width < 360 ? 17 : 20,
                              }}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              minimumFontScale={0.8}
                            >
                              {formatPrice(item.room_type?.base_price)}
                            </Text>

                            <Text
                              className="text-white/50 tracking-wide"
                              style={{ fontSize: width < 360 ? 9 : 10 }}
                              numberOfLines={1}
                            >
                              per night
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View className="px-5 py-4 bg-white">
                        <View className="flex-row items-center gap-5 mb-4">
                          <View className="flex-row items-center gap-1.5">
                            <Ionicons
                              name="people-outline"
                              size={13}
                              color="#1a4a35"
                            />

                            <Text className="text-[#1a4a35]/60 text-xs">
                              {item.room_type?.max_occupancy || 2} guests
                            </Text>
                          </View>

                          <View className="w-px h-3 bg-[#1a4a35]/15" />

                          <View className="flex-row items-center gap-1.5">
                            <Ionicons
                              name="resize-outline"
                              size={13}
                              color="#1a4a35"
                            />

                            <Text className="text-[#1a4a35]/60 text-xs">
                              {item.room_type?.size || 25} m²
                            </Text>
                          </View>

                          <View className="w-px h-3 bg-[#1a4a35]/15" />

                          <View className="flex-row items-center gap-1.5">
                            <Ionicons
                              name="star-outline"
                              size={13}
                              color="#c9a96e"
                            />

                            <Text
                              className="text-[#1a4a35]/60 text-xs"
                              numberOfLines={1}
                            >
                              {type}
                            </Text>
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

                            <Ionicons
                              name="arrow-forward"
                              size={14}
                              color="#c9a96e"
                            />
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

      {/* FLOATING CHAT BUTTON */}
      <TouchableOpacity
        onPress={() => {
          if (isNavigating) return;

          setIsNavigating(true);

          setHasUnreadMessages(false);

          router.push("/chat/1");

          setTimeout(() => {
            setIsNavigating(false);
          }, 1000);
        }}
        activeOpacity={0.85}
        style={{
          position: "absolute",
          bottom: insets.bottom + 20,
          right: width < 360 ? 16 : 20,
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
            width: width < 360 ? 52 : 56,
            height: width < 360 ? 52 : 56,
            borderRadius: width < 360 ? 26 : 28,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={width < 360 ? 24 : 27}
            color="#c9a96e"
          />
        </LinearGradient>

        {hasUnreadMessages && (
          <View
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: "#ef4444",
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 2,
              borderColor: "#faf8f3",
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#fff",
              }}
            />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}