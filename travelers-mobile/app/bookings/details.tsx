import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  RefreshControl,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useEffect, useState, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "@/services/api";

const { width } = Dimensions.get("window");

// Maps amenity names from DB to Ionicons
const AMENITY_ICON_MAP: Record<string, string> = {
  tv: "tv-outline",
  wifi: "wifi-outline",
  aircon: "snow-outline",
  "air con": "snow-outline",
  "air conditioning": "snow-outline",
  "hot water": "water-outline",
  minibar: "cafe-outline",
  safe: "shield-checkmark-outline",
  "safe box": "shield-checkmark-outline",
  parking: "car-outline",
  pool: "water-outline",
  gym: "barbell-outline",
  restaurant: "restaurant-outline",
  breakfast: "cafe-outline",
  balcony: "sunny-outline",
  kitchen: "restaurant-outline",
  refrigerator: "thermometer-outline",
  "room service": "call-outline",
  laundry: "shirt-outline",
};

const getAmenityIcon = (name: string): string => {
  const lower = name.toLowerCase();

  for (const [key, icon] of Object.entries(AMENITY_ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }

  return "checkmark-circle-outline";
};

interface Amenity {
  id: number;
  name: string;
}

interface BookingRange {
  check_in_date: string;
  check_out_date: string;
}

interface RoomImage {
  id: number;
  image_type: string;
  url: string;
}

export default function BookingDetails() {
  const { room } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Blocked dates for this room
  const [bookedRanges, setBookedRanges] = useState<BookingRange[]>([]);
  const [loadingBookedDates, setLoadingBookedDates] = useState(false);

  // Image gallery
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const parsedRoom = room ? JSON.parse(room as string) : null;

  /*
   * ============================================================
   * LOAD BLOCKED DATES
   * ============================================================
   */
  useEffect(() => {
    if (!parsedRoom?.id) return;

    fetchBookedDates();
  }, [parsedRoom?.id]);

  const fetchBookedDates = async (): Promise<BookingRange[]> => {
    if (!parsedRoom?.id) return [];

    try {
      setLoadingBookedDates(true);

      const response = await api.get(`/rooms/${parsedRoom.id}/booked-dates`);

      const ranges: BookingRange[] = Array.isArray(response.data)
        ? response.data
        : [];

      setBookedRanges(ranges);

      return ranges;
    } catch (error) {
      console.log("Failed to load blocked dates:", error);

      setBookedRanges([]);

      return [];
    } finally {
      setLoadingBookedDates(false);
    }
  };

  if (!parsedRoom) {
    return (
      <View className="flex-1 justify-center items-center bg-[#faf8f3]">
        <Text className="text-[#1a4a35]/50" style={{ fontFamily: "Georgia" }}>
          No room data
        </Text>
      </View>
    );
  }

  const amenities: Amenity[] = parsedRoom.amenities ?? [];

  const roomDescription = parsedRoom.room_type?.description;

  // ============================================================
  // BUILD IMAGE GALLERY
  // ============================================================
  const normalImages: RoomImage[] = Array.isArray(parsedRoom.images)
    ? parsedRoom.images.filter((img: RoomImage) => img.image_type === "normal")
    : [];

  const galleryImages: RoomImage[] =
    normalImages.length > 0
      ? normalImages
      : parsedRoom.image_url
        ? [
            {
              id: 0,
              image_type: "normal",
              url: parsedRoom.image_url,
            },
          ]
        : [];

  /*
   * ============================================================
   * OPEN CREATE BOOKING
   * ============================================================
   */
  const handleBook = async () => {
    if (loading) return;

    try {
      setLoading(true);

      let ranges = bookedRanges;

      if (loadingBookedDates) {
        ranges = await fetchBookedDates();
      }

      router.push({
        pathname: "/bookings/create",
        params: {
          room: JSON.stringify(parsedRoom),
          bookedRanges: JSON.stringify(ranges),
        },
      });
    } catch (error) {
      console.log("Failed to open booking:", error);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  /*
   * ============================================================
   * REFRESH
   * ============================================================
   */
  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await fetchBookedDates();
    } catch (error) {
      console.log("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  /*
   * ============================================================
   * IMAGE GALLERY SCROLL HANDLER
   * ============================================================
   */
  const onGalleryScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;

    const index = Math.round(offsetX / width);

    if (index !== activeImageIndex) {
      setActiveImageIndex(index);
    }
  };

  const statusConfig: Record<
    string,
    {
      bg: string;
      text: string;
      dot: string;
      label: string;
    }
  > = {
    available: {
      bg: "rgba(22,163,74,0.12)",
      text: "#15803d",
      dot: "#16a34a",
      label: "Available",
    },

    occupied: {
      bg: "rgba(37,99,235,0.10)",
      text: "#1d4ed8",
      dot: "#2563eb",
      label: "Occupied",
    },

    maintenance: {
      bg: "rgba(220,38,38,0.10)",
      text: "#b91c1c",
      dot: "#dc2626",
      label: "Maintenance",
    },
  };

  const physicalStatus = String(parsedRoom.status || "available").toLowerCase();

  const isMaintenance = physicalStatus === "maintenance";

  const status = isMaintenance
    ? statusConfig.maintenance
    : statusConfig.available;

  const canReserve = !isMaintenance;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(price);

  return (
    <View className="flex-1 bg-[#faf8f3]">
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1a4a35"
            colors={["#1a4a35"]}
          />
        }
      >
        {/* ── HERO IMAGE GALLERY ── */}

        <View style={{ height: 480 }}>
          {galleryImages.length > 0 ? (
            <FlatList
              ref={flatListRef}
              data={galleryImages}
              keyExtractor={(item) => String(item.id)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onGalleryScroll}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item.url }}
                  style={{
                    width,
                    height: 480,
                  }}
                  className="bg-[#e8e4d9]"
                />
              )}
            />
          ) : (
            <Image
              source={{ uri: "https://picsum.photos/seed/room/800/600" }}
              style={{
                width: "100%",
                height: "100%",
              }}
              className="bg-[#e8e4d9]"
            />
          )}

          <LinearGradient
            colors={["rgba(13,46,31,0.55)", "transparent"]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 160,
            }}
          />

          <LinearGradient
            colors={["transparent", "rgba(13,46,31,0.92)"]}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 240,
            }}
          />

          {/* Back button */}

          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              top: insets.top + 12,
            }}
            className="absolute left-5 w-10 h-10 rounded-full bg-black/30 border border-white/20 justify-center items-center"
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* 360° view button */}

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/bookings/panorama",
                params: {
                  panorama: parsedRoom.panorama_url,
                  room: JSON.stringify(parsedRoom),
                },
              })
            }
            style={{
              top: insets.top + 12,
            }}
            activeOpacity={0.8}
            className="absolute right-5"
          >
            <BlurView
              intensity={40}
              tint="dark"
              className="rounded-full overflow-hidden border border-white/20"
            >
              <View className="flex-row items-center gap-1.5 px-4 py-2.5">
                <Ionicons name="eye-outline" size={15} color="#c9a96e" />

                <Text className="text-white text-xs tracking-widest uppercase">
                  360°
                </Text>
              </View>
            </BlurView>
          </TouchableOpacity>

          {/* ── IMAGE INDICATOR — TOP CENTER ── */}

          {galleryImages.length > 1 && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: insets.top + 22,
                left: 0,
                right: 0,
                alignItems: "center",
              }}
            >
              <BlurView
                intensity={40}
                tint="dark"
                className="rounded-full overflow-hidden border border-white/20"
              >
                <View className="px-4 py-2">
                  <Text className="text-white text-[11px] tracking-[3px]">
                    {activeImageIndex + 1} / {galleryImages.length}
                  </Text>
                </View>
              </BlurView>
            </View>
          )}

          {/* Hero title block */}

          <View className="absolute bottom-8 left-6 right-6">
            <Text className="text-[#c9a96e] text-[10px] tracking-[4px] uppercase mb-1">
              {parsedRoom.room_type?.type_name}
            </Text>

            <Text
              className="text-white text-5xl mb-3"
              style={{ fontFamily: "Georgia" }}
            >
              Room {parsedRoom.room_number}
            </Text>

            {/* Status pill */}

            <View
              style={{
                position: "absolute",
                bottom: 20,
                left: 250,
                backgroundColor: status.bg,
                borderWidth: 1,
                borderColor: status.dot + "44",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: status.dot,
                }}
              />

              <Text
                className="text-xs tracking-widest uppercase"
                style={{
                  color: status.text,
                }}
              >
                {status.label}
              </Text>
            </View>
          </View>
        </View>

        {/* ── CONTENT CARD ── */}

        <View className="bg-[#faf8f3] rounded-t-[32px] -mt-8 px-6 pt-8 pb-40">
          {/* ── THUMBNAIL STRIP — ABOVE PRICE ── */}

          {galleryImages.length > 1 && (
            <View className="mb-6">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                {galleryImages.map((img, index) => (
                  <TouchableOpacity
                    key={img.id}
                    onPress={() => {
                      setActiveImageIndex(index);

                      flatListRef.current?.scrollToIndex({
                        index,
                        animated: true,
                      });
                    }}
                    activeOpacity={0.8}
                    style={{
                      borderWidth: 2,
                      borderColor:
                        index === activeImageIndex ? "#1a4a35" : "transparent",
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    <Image
                      source={{ uri: img.url }}
                      style={{
                        width: 64,
                        height: 64,
                      }}
                      className="bg-[#e8e4d9]"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Price row */}

          <View className="flex-row justify-between items-start mb-6">
            <View>
              <Text className="text-[#1a4a35]/40 text-[10px] tracking-widest uppercase mb-1">
                Starting from
              </Text>

              <View className="flex-row items-baseline gap-1">
                <Text
                  className="text-[#1a4a35] text-4xl"
                  style={{ fontFamily: "Georgia" }}
                >
                  {formatPrice(parsedRoom.room_type?.base_price)}
                </Text>

                <Text className="text-[#1a4a35]/40 text-sm">/night</Text>
              </View>
            </View>

            {/* Quick stats */}

            <View className="items-end gap-1">
              <View className="flex-row items-center gap-1.5 bg-[#1a4a35]/06 px-3 py-1.5 rounded-full">
                <Ionicons name="people-outline" size={13} color="#1a4a35" />

                <Text className="text-[#1a4a35] text-xs">
                  {parsedRoom.room_type?.max_occupancy || 2} guests
                </Text>
              </View>
            </View>
          </View>

          <View className="h-px bg-[#1a4a35]/08 mb-1" />

          {/* Description */}

          <Text className="text-[#1a4a35]/50 text-xs tracking-[3px] uppercase mb-3">
            About This Room
          </Text>

          <Text
            className="text-[#2c2c2c] text-base leading-7 mb-8"
            style={{ fontFamily: "Georgia" }}
          >
            {roomDescription}
          </Text>

          <View className="h-px bg-[#1a4a35]/08 mb-1" />

          {/* Amenities */}

          <Text className="text-[#1a4a35]/50 text-xs tracking-[3px] uppercase mb-2">
            Amenities
          </Text>

          {amenities.length > 0 ? (
            <View className="flex-row flex-wrap gap-3 mb-8">
              {amenities.map((amenity) => (
                <View
                  key={amenity.id}
                  className="flex-row items-center gap-2 px-3.5 py-2 rounded-full border border-[#1a4a35]/12 bg-white"
                >
                  <Ionicons
                    name={getAmenityIcon(amenity.name) as any}
                    size={13}
                    color="#c9a96e"
                  />

                  <Text className="text-[#1a4a35] text-xs">{amenity.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text
              className="text-[#1a4a35]/30 text-sm mb-8"
              style={{ fontFamily: "Georgia" }}
            >
              No amenities listed for this room.
            </Text>
          )}

          <View className="h-px bg-[#1a4a35]/08 mb-2" />

          {/* Policies */}

          <Text className="text-[#1a4a35]/50 text-xs tracking-[3px] uppercase mb-2">
            Policies
          </Text>

          {[
            {
              icon: "ban-outline",
              text: "No smoking inside the room",
            },
          ].map((p) => (
            <View key={p.text} className="flex-row items-center gap-3 mb-3">
              <View className="w-7 h-7 rounded-full bg-[#1a4a35]/06 justify-center items-center">
                <Ionicons name={p.icon as any} size={13} color="#1a4a35" />
              </View>

              <Text className="text-[#2c2c2c]/70 text-sm">{p.text}</Text>
            </View>
          ))}

          {/* =================================================
              EXPECTED STAY TIME — INFO BANNER
          ================================================= */}

          <View className="mt-1">
            <View className="bg-[#e9efeb] rounded-2xl border border-[#1a4a35]/10 overflow-hidden">
              <View className="p-3 pl-4">
                <View className="flex-row items-center mb-1">
                  <View className="w-7 h-7 rounded-full bg-[#1a4a35] items-center justify-center mr-2">
                    <Ionicons name="time-outline" size={14} color="#ffffff" />
                  </View>

                  <View className="flex-1">
                    <Text className="text-[#1a4a35] text-sm font-semibold">
                      Expected Stay Time
                    </Text>

                    <Text className="text-[#1a4a35]/45 text-[9px]">
                      Standard hotel check-in and check-out time
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-center mt-1">
                  <View className="w-[120px]">
                    <Text className="text-[#1a4a35]/40 text-[8px] tracking-widest uppercase text-center">
                      Check-in
                    </Text>

                    <Text
                      className="text-[#1a4a35] text-base mt-0.5 text-center"
                      style={{
                        fontFamily: "Georgia",
                      }}
                    >
                      2:00 PM
                    </Text>
                  </View>

                  <View className="w-px h-7 bg-[#1a4a35]/10 mx-6" />

                  <View className="w-[120px]">
                    <Text className="text-[#1a4a35]/40 text-[8px] tracking-widest uppercase text-center">
                      Check-out
                    </Text>

                    <Text
                      className="text-[#1a4a35] text-base mt-0.5 text-center"
                      style={{
                        fontFamily: "Georgia",
                      }}
                    >
                      11:00 AM
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-start mt-2 pt-2 border-t border-[#1a4a35]/10">
                  <Ionicons
                    name="information-circle-outline"
                    size={12}
                    color="#1a4a35"
                    style={{
                      marginTop: 1,
                      marginRight: 5,
                    }}
                  />

                  <Text className="flex-1 text-[#1a4a35]/45 text-[9px] leading-4">
                    Early check-in and late check-out may incur an additional
                    fee.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── BOOK CTA ── */}

      <View
        className="absolute bottom-0 left-0 right-0 px-6 bg-[#faf8f3] border-t border-[#1a4a35]/08"
        style={{
          paddingBottom: insets.bottom + 16,
          paddingTop: 16,
        }}
      >
        <View className="flex-row items-center gap-4">
          <View className="flex-1">
            <Text className="text-[#1a4a35]/40 text-[10px] tracking-widest uppercase">
              Total from
            </Text>

            <Text
              className="text-[#1a4a35] text-xl"
              style={{ fontFamily: "Georgia" }}
            >
              {formatPrice(parsedRoom.room_type?.base_price)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleBook}
            disabled={loading || !canReserve}
            activeOpacity={0.85}
            className="rounded-2xl overflow-hidden flex-1"
          >
            <LinearGradient
              colors={
                loading || !canReserve
                  ? ["#9ca3af", "#6b7280"]
                  : ["#1a4a35", "#0d2e1f"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="flex-row items-center justify-center py-4 gap-2"
            >
              <Text
                className="text-white text-sm tracking-widest uppercase"
                style={{ fontFamily: "Georgia" }}
              >
                {loading
                  ? "Opening..."
                  : !canReserve
                    ? isMaintenance
                      ? "Maintenance"
                      : "Occupied"
                    : "Reserve Now"}
              </Text>

              {!loading && (
                <Ionicons name="arrow-forward" size={14} color="#c9a96e" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}