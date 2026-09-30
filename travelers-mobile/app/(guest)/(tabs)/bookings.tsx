import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Modal,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import api from "@/services/api";

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
  refunded: {
    bg: "rgba(126,34,206,0.85)",
    text: "#fff",
    dot: "#fff",
    label: "Refunded",
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

  // BOOKING DETAILS MODAL
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const [showBookingDetails, setShowBookingDetails] = useState(false);

  // Prevent unnecessary refetch
  const hasLoadedBookings = useRef(false);
  const previousFilter = useRef(filter);
  const previousPage = useRef(page);

  const insets = useSafeAreaInsets();

  // =========================================================
  // FETCH BOOKINGS
  // =========================================================

  const fetchBookings = async (currentPage = 1, isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        if (data.length === 0) {
          setLoading(true);
        } else {
          setContentLoading(true);
        }
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

  // =========================================================
  // REFRESH
  // =========================================================

  const onRefresh = async () => {
    try {
      setRefreshing(true);

      await fetchBookings(page, true);
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  };

  // =========================================================
  // INITIAL LOAD / FILTER / PAGE
  // =========================================================

  useEffect(() => {
    const filterChanged = previousFilter.current !== filter;

    const pageChanged = previousPage.current !== page;

    // First load only
    if (!hasLoadedBookings.current) {
      hasLoadedBookings.current = true;

      previousFilter.current = filter;
      previousPage.current = page;

      fetchBookings(page);

      return;
    }

    // Fetch only when filter or page changes
    if (filterChanged || pageChanged) {
      previousFilter.current = filter;
      previousPage.current = page;

      fetchBookings(page);
    }
  }, [filter, page]);

  // =========================================================
  // FILTER DATA
  // =========================================================

  const filteredData = data.filter((item) => {
    const status = item.booked_rooms?.[0]?.status || item.booking_status;

    if (filter === "active") {
      return !["checked_out", "refunded"].includes(status);
    }

    return ["checked_out", "refunded"].includes(status);
  });

  // =========================================================
  // FORMAT PRICE
  // =========================================================

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(Number(price || 0));

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";

    return new Date(dateStr).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // =========================================================
  // OPEN DETAILS
  // =========================================================

  const handleViewDetails = (booking: any) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  // =========================================================
  // CLOSE DETAILS
  // =========================================================

  const closeBookingDetails = () => {
    setShowBookingDetails(false);
    setSelectedBooking(null);
  };

  // =========================================================
  // LOADING
  // =========================================================

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

      {/* =====================================================
          HEADER
      ===================================================== */}

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
          style={{
            width: 240,
            height: 240,
            top: -60,
            right: -60,
          }}
        />

        <View
          className="absolute rounded-full border border-white/5"
          style={{
            width: 140,
            height: 140,
            top: -10,
            right: -10,
          }}
        />

        {/* Title */}

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

        {/* FILTER */}

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

      {/* =====================================================
          CONTENT LOADING
      ===================================================== */}

      {contentLoading && (
        <View className="absolute top-[220px] left-0 right-0 z-50 items-center">
          <View className="bg-white px-4 py-2 rounded-full shadow">
            <ActivityIndicator size="small" color="#1a4a35" />
          </View>
        </View>
      )}

      {/* =====================================================
          BOOKING LIST
      ===================================================== */}

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
              {filter === "active"
                ? "No active bookings"
                : "No booking history"}
            </Text>

            <Text className="text-[#1a4a35]/40 text-sm text-center leading-5">
              {filter === "active"
                ? "Your active bookings will appear here"
                : "Your past bookings will appear here"}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const room = item.booked_rooms?.[0]?.room || item.rooms?.[0];

          // IMPORTANT:
          // Do NOT append Date.now() here.
          // This prevents the image from reloading
          // whenever the modal opens/closes.
          const normalImage = room?.image_url || null;

          const bookingStatus =
            item.booked_rooms?.[0]?.status || item.booking_status || "pending";

          const statusKey = bookingStatus.toLowerCase().replace("-", "_");

          const s = STATUS_CONFIG[statusKey as keyof typeof STATUS_CONFIG] ?? {
            bg: "rgba(0,0,0,0.45)",
            text: "#fff",
            dot: "#fff",
            label: bookingStatus,
          };

          const nights = (() => {
            if (!item.check_in_date || !item.check_out_date) {
              return null;
            }

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
                elevation: 3,
              }}
            >
              {/* ROOM IMAGE */}

              <View className="relative">
                <Image
                  source={{
                    uri:
                      normalImage ||
                      "https://picsum.photos/seed/booking/400/250",
                  }}
                  style={{
                    width: "100%",
                    height: 180,
                  }}
                  fadeDuration={0}
                />

                <LinearGradient
                  colors={["transparent", "rgba(13,46,31,0.85)"]}
                  className="absolute bottom-0 left-0 right-0 h-24"
                />

                {/* STATUS */}

                <View
                  className="absolute top-4 left-4 flex-row items-center gap-1.5 px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: s.bg,
                  }}
                >
                  <View
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: s.dot,
                    }}
                  />

                  <Text
                    className="text-[10px] tracking-widest uppercase font-medium"
                    style={{
                      color: s.text,
                    }}
                  >
                    {s.label}
                  </Text>
                </View>

                {/* ROOM NUMBER / PRICE */}

                <View className="absolute bottom-4 left-4 right-4 flex-row justify-between items-end">
                  <View>
                    <Text className="text-white/60 text-[10px] tracking-widest uppercase mb-0.5">
                      Room
                    </Text>

                    <Text
                      className="text-white text-3xl"
                      style={{
                        fontFamily: "Georgia",
                      }}
                    >
                      {room?.room_number ?? "N/A"}
                    </Text>
                  </View>

                  <Text
                    className="text-[#c9a96e] text-xl"
                    style={{
                      fontFamily: "Georgia",
                    }}
                  >
                    {formatPrice(item.total_price)}
                  </Text>
                </View>
              </View>

              {/* CARD BODY */}

              <View className="px-5 py-4">
                <View className="flex-row items-center gap-3 mb-4">
                  {/* CHECK-IN */}

                  <View className="flex-1">
                    <Text className="text-[#1a4a35]/40 text-[10px] tracking-widest uppercase mb-1">
                      Check-in
                    </Text>

                    <Text className="text-[#1a4a35] text-sm font-medium">
                      {formatDate(item.check_in_date)}
                    </Text>
                  </View>

                  {/* NIGHTS */}

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

                  {/* CHECK-OUT */}

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

                {/* BUTTONS */}

                <View className="flex-row gap-2">
                  {/* VIEW DETAILS */}

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleViewDetails(item)}
                    className="rounded-xl overflow-hidden flex-1"
                  >
                    <LinearGradient
                      colors={["#1a4a35", "#0d2e1f"]}
                      start={{
                        x: 0,
                        y: 0,
                      }}
                      end={{
                        x: 1,
                        y: 0,
                      }}
                      className="flex-row items-center justify-center py-3 gap-2"
                    >
                      <Text
                        className="text-white text-xs tracking-widest uppercase"
                        style={{
                          fontFamily: "Georgia",
                        }}
                      >
                        View Details
                      </Text>

                      <Ionicons
                        name="arrow-forward"
                        size={13}
                        color="#c9a96e"
                      />
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* CANCEL */}

                  {bookingStatus === "pending" && (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={async () => {
                        try {
                          await api.put(`/bookings/${item.id}`, {
                            status: "cancelled",
                          });

                          fetchBookings(page);
                        } catch (e) {
                          console.log(e);
                        }
                      }}
                      className="bg-red-600 px-4 rounded-xl justify-center items-center"
                    >
                      <Ionicons name="close" size={18} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* ========================================================= */}
      {/*                    BOOKING DETAILS MODAL                  */}
      {/* ========================================================= */}
      <Modal
        visible={showBookingDetails}
        transparent
        animationType="slide"
        onRequestClose={closeBookingDetails}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className="bg-[#FFFDF7] rounded-t-[30px] px-5 pt-5"
            style={{
              maxHeight: "88%",
              paddingBottom: Math.max(20, insets.bottom + 10),
            }}
          >
            {/* ================================================= */}
            {/* MODAL HEADER */}
            {/* ================================================= */}
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-1">
                <Text
                  className="text-[#1a4a35] text-2xl"
                  style={{ fontFamily: "Georgia" }}
                >
                  Booking Details
                </Text>

                <Text className="text-[#1a4a35]/40 text-xs mt-1">
                  {selectedBooking?.booking_reference || "Booking Information"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={closeBookingDetails}
                activeOpacity={0.7}
                className="w-10 h-10 rounded-full bg-[#1a4a35]/10 items-center justify-center"
              >
                <Ionicons name="close" size={22} color="#1a4a35" />
              </TouchableOpacity>
            </View>

            {/* ================================================= */}
            {/* IMPORTANT: GET THE CORRECT STATUS */}
            {/* ================================================= */}

            {(() => {
              /*
               * IMPORTANT:
               * The booking card uses booking_status first.
               * We do the SAME here so the modal will show
               * CONFIRMED when the booking card is CONFIRMED.
               */
              const rawStatus =
                selectedBooking?.booking_status ||
                selectedBooking?.booked_rooms?.[0]?.status ||
                "pending";

              const bookingStatus = String(rawStatus)
                .toLowerCase()
                .replace(/[\s-]+/g, "_");

              const statusLabel =
                bookingStatus === "checked_in"
                  ? "Checked In"
                  : bookingStatus === "checked_out"
                    ? "Checked Out"
                    : bookingStatus === "cancelled"
                      ? "Cancelled"
                      : bookingStatus === "refunded"
                        ? "Refunded"
                        : bookingStatus === "confirmed"
                          ? "Confirmed"
                          : "Pending";

              /*
               * IMPORTANT:
               * Backend relation is "payments".
               * Prefer the PAID payment if there are multiple payments.
               */
              const payments = Array.isArray(selectedBooking?.payments)
                ? selectedBooking.payments
                : [];

              const payment =
                payments.find(
                  (p: any) =>
                    String(p?.payment_status || "").toLowerCase() === "paid",
                ) || payments[0];

              const paymentMethod = payment?.payment_method || null;

              const paymentStatus = payment?.payment_status || null;

              const paymentMethodLabel = paymentMethod
                ? String(paymentMethod).replace(/_/g, " ").toUpperCase()
                : "—";

              const paymentStatusLabel = paymentStatus
                ? String(paymentStatus).toUpperCase()
                : "—";

              const bookedRoom = selectedBooking?.booked_rooms?.[0];

              const room = bookedRoom?.room;

              const roomNumber =
                room?.room_number ||
                bookedRoom?.room_number ||
                selectedBooking?.room_number ||
                "—";

              const roomType =
                room?.room_type?.type_name ||
                room?.roomType?.type_name ||
                bookedRoom?.room_type ||
                "Room";

              const checkIn =
                bookedRoom?.check_in_date || selectedBooking?.check_in_date;

              const checkOut =
                bookedRoom?.check_out_date || selectedBooking?.check_out_date;

              const stayType =
                bookedRoom?.stay_type ||
                selectedBooking?.stay_type ||
                "overnight";

              const nights = (() => {
                if (!checkIn || !checkOut) return 1;

                const start = new Date(checkIn).getTime();
                const end = new Date(checkOut).getTime();

                const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));

                return Math.max(1, diff);
              })();

              const statusColor =
                bookingStatus === "confirmed"
                  ? "#2563EB"
                  : bookingStatus === "checked_in"
                    ? "#2563EB"
                    : bookingStatus === "checked_out"
                      ? "#16A34A"
                      : bookingStatus === "cancelled"
                        ? "#DC2626"
                        : bookingStatus === "refunded"
                          ? "#9333EA"
                          : "#D97706";

              return (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingBottom: 20,
                  }}
                >
                  {/* ================================================= */}
                  {/* STATUS */}
                  {/* ================================================= */}
                  <View className="flex-row items-center justify-between py-4 border-b border-[#1a4a35]/10">
                    <Text className="text-[#1a4a35]/50 text-sm">Status</Text>

                    <View
                      className="px-4 py-2 rounded-full"
                      style={{
                        backgroundColor: statusColor,
                      }}
                    >
                      <Text className="text-white text-xs font-bold uppercase">
                        {statusLabel}
                      </Text>
                    </View>
                  </View>

                  {/* ================================================= */}
                  {/* BOOKING REFERENCE */}
                  {/* ================================================= */}
                  <View className="py-5 border-b border-[#1a4a35]/10">
                    <Text className="text-[#1a4a35]/45 text-xs mb-1">
                      Booking Reference
                    </Text>

                    <Text
                      className="text-[#1a4a35] text-base font-bold"
                      selectable
                    >
                      {selectedBooking?.booking_reference || "—"}
                    </Text>
                  </View>

                  {/* ================================================= */}
                  {/* ROOM */}
                  {/* ================================================= */}
                  <View className="py-5 border-b border-[#1a4a35]/10">
                    <Text className="text-[#1a4a35]/45 text-xs mb-2">Room</Text>

                    <View className="flex-row justify-between items-start">
                      <View>
                        <Text className="text-[#1a4a35] text-base font-bold">
                          Room {roomNumber}
                        </Text>

                        <Text className="text-[#1a4a35]/60 text-sm mt-1">
                          {roomType}
                        </Text>

                        <Text className="text-[#1a4a35]/50 text-xs mt-1 capitalize">
                          {String(stayType).replace(/_/g, " ")}
                        </Text>
                      </View>

                      <Text className="text-[#1a4a35] text-lg font-bold">
                        {formatPrice(
                          bookedRoom?.subtotal ??
                            bookedRoom?.price_at_time_of_booking ??
                            selectedBooking?.total_price ??
                            0,
                        )}
                      </Text>
                    </View>
                  </View>

                  {/* ================================================= */}
                  {/* STAY INFORMATION */}
                  {/* ================================================= */}
                  <View className="py-5 border-b border-[#1a4a35]/10">
                    <Text className="text-[#1a4a35]/45 text-xs mb-4">
                      Stay Information
                    </Text>

                    <View className="flex-row justify-between">
                      <View>
                        <Text className="text-[#1a4a35]/45 text-[10px] uppercase">
                          Check-in
                        </Text>

                        <Text className="text-[#1a4a35] font-bold mt-1">
                          {formatDate(checkIn)}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text className="text-[#1a4a35]/45 text-[10px] uppercase">
                          Check-out
                        </Text>

                        <Text className="text-[#1a4a35] font-bold mt-1">
                          {formatDate(checkOut)}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row justify-between mt-5">
                      <View>
                        <Text className="text-[#1a4a35]/45 text-[10px] uppercase">
                          Stay Type
                        </Text>

                        <Text className="text-[#1a4a35] font-bold mt-1 capitalize">
                          {String(stayType).replace(/_/g, " ")}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text className="text-[#1a4a35]/45 text-[10px] uppercase">
                          Duration
                        </Text>

                        <Text className="text-[#1a4a35] font-bold mt-1">
                          {nights} night{nights !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* ================================================= */}
                  {/* PAYMENT */}
                  {/* ================================================= */}
                  <View className="py-5 border-b border-[#1a4a35]/10">
                    <Text className="text-[#1a4a35]/45 text-xs mb-4">
                      Payment
                    </Text>

                    <View className="flex-row justify-between mb-4">
                      <Text className="text-[#1a4a35]/50">Method</Text>

                      <Text className="text-[#1a4a35] font-bold">
                        {paymentMethodLabel}
                      </Text>
                    </View>

                    <View className="flex-row justify-between mb-4">
                      <Text className="text-[#1a4a35]/50">Status</Text>

                      <Text
                        className="font-bold"
                        style={{
                          color:
                            paymentStatus?.toLowerCase() === "paid"
                              ? "#16A34A"
                              : paymentStatus?.toLowerCase() === "refunded"
                                ? "#9333EA"
                                : "#D97706",
                        }}
                      >
                        {paymentStatusLabel}
                      </Text>
                    </View>

                    {/* PAYMENT DATE */}
                    <View className="flex-row justify-between mb-4">
                      <Text className="text-[#1a4a35]/50">Date</Text>

                      <Text className="text-[#1a4a35] font-semibold">
                        {payment?.payment_date
                          ? new Date(payment.payment_date).toLocaleDateString(
                              "en-PH",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )
                          : payment?.created_at
                            ? new Date(payment.created_at).toLocaleDateString(
                                "en-PH",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )
                            : "—"}
                      </Text>
                    </View>

                    {/* PAYMENT DATE & TIME */}
                    <View className="flex-row justify-between">
                      <Text className="text-[#1a4a35]/50">Date & Time</Text>

                      <Text className="text-[#1a4a35] font-semibold">
                        {payment?.payment_date
                          ? `${new Date(
                              payment.payment_date,
                            ).toLocaleDateString("en-US", {
                              month: "2-digit",
                              day: "2-digit",
                              year: "numeric",
                            })} at ${new Date(
                              payment.payment_date,
                            ).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}`
                          : payment?.created_at
                            ? `${new Date(
                                payment.created_at,
                              ).toLocaleDateString("en-US", {
                                month: "2-digit",
                                day: "2-digit",
                                year: "numeric",
                              })} at ${new Date(
                                payment.created_at,
                              ).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}`
                            : "—"}
                      </Text>
                    </View>

                    {/* PAYMENT REFERENCE */}
                    {(payment?.reference_number ||
                      payment?.gcash_reference ||
                      payment?.bank_reference) && (
                      <View className="flex-row justify-between mt-4">
                        <Text className="text-[#1a4a35]/50">Reference No.</Text>

                        <Text
                          className="text-[#1a4a35] font-semibold flex-1 text-right ml-5"
                          numberOfLines={1}
                        >
                          {payment?.reference_number ||
                            payment?.gcash_reference ||
                            payment?.bank_reference}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* ================================================= */}
                  {/* TOTAL */}
                  {/* ================================================= */}
                  <View className="py-5">
                    <View className="flex-row justify-between items-center">
                      <View>
                        <Text className="text-[#1a4a35]/45 text-xs uppercase tracking-wider">
                          Total Amount
                        </Text>

                        <Text className="text-[#1a4a35]/40 text-xs mt-1">
                          Booking Total
                        </Text>
                      </View>

                      <Text
                        className="text-[#1a4a35] text-2xl font-bold"
                        style={{ fontFamily: "Georgia" }}
                      >
                        {formatPrice(selectedBooking?.total_price || 0)}
                      </Text>
                    </View>
                  </View>

                  {/* ================================================= */}
                  {/* ACTION BUTTONS */}
                  {/* ================================================= */}

                  <View className="flex-row gap-3 mt-1">
                    {/* CANCEL - PENDING ONLY */}
                    {bookingStatus === "pending" && (
                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            await api.put(`/bookings/${selectedBooking.id}`, {
                              status: "cancelled",
                            });

                            closeBookingDetails();

                            await fetchBookings(page);
                          } catch (error: any) {
                            console.log(
                              "❌ CANCEL BOOKING ERROR:",
                              error?.response?.data || error,
                            );
                          }
                        }}
                        activeOpacity={0.85}
                        className="flex-1 border border-red-500 rounded-xl py-4 items-center"
                      >
                        <Text className="text-red-600 font-bold">
                          Cancel Booking
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* CLOSE */}
                    <TouchableOpacity
                      onPress={closeBookingDetails}
                      activeOpacity={0.85}
                      className={
                        bookingStatus === "pending"
                          ? "flex-1 bg-[#1a4a35] rounded-xl py-4 items-center"
                          : "w-full bg-[#1a4a35] rounded-xl py-4 items-center"
                      }
                    >
                      <Text className="text-white font-bold">Close</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}
