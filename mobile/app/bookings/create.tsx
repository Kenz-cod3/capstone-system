import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "@/services/api";

export default function CreateBooking() {
  const { room } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const parsedRoom = room ? JSON.parse(room as string) : null;

  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);
  const [loading, setLoading] = useState(false);

  const [bookingType, setBookingType] = useState<"overnight" | "short">("overnight");

  if (!parsedRoom) {
    return (
      <View className="flex-1 justify-center items-center bg-[#faf8f3]">
        <Text className="text-[#1a4a35]/50" style={{ fontFamily: "Georgia" }}>
          No room selected
        </Text>
      </View>
    );
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleDateString("en-PH", {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getNights = () => {
    if (!checkInDate || !checkOutDate || checkOutDate <= checkInDate) return 0;
    return Math.round(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  const getOvernightTotal = () => {
    const nights = getNights();
    return nights * (parsedRoom.room_type?.base_price || 0);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(price);

  // Use correct field name: short_stay_price (not short_price)
  const shortStayPrice = parsedRoom.room_type?.short_stay_price || 0;
  const nights = getNights();
  const overnightTotal = getOvernightTotal();

  // Short stay is a flat rate for a single selected date (no hours picker anymore)
  const shortTotal = shortStayPrice;

  const total = bookingType === "overnight" ? overnightTotal : shortTotal;

  const canBook =
    bookingType === "overnight"
      ? !!checkInDate && !!checkOutDate && checkOutDate > checkInDate && overnightTotal > 0
      : !!checkInDate && shortStayPrice > 0;

  const handleBooking = () => {
    // Overnight validation
    if (bookingType === "overnight") {
      if (!checkInDate || !checkOutDate) {
        alert("Please select check-in and check-out dates");
        return;
      }

      if (checkOutDate <= checkInDate) {
        alert("Check-out must be after check-in");
        return;
      }
    }

    // Short stay validation - only needs a single date from the calendar
    if (bookingType === "short") {
      if (!checkInDate) {
        alert("Please select a date");
        return;
      }

      if (!shortStayPrice || shortStayPrice === 0) {
        alert("Short stay pricing is not available for this room");
        return;
      }
    }

    // For short stay, check-out date mirrors check-in date (same-day stay)
    const effectiveCheckOut =
      bookingType === "short" ? checkInDate : checkOutDate;

    router.push({
      pathname: "/bookings/payment",

      params: {
        room_id: parsedRoom.id,

        booking_type: bookingType,

        check_in_date: formatDate(checkInDate) || "",

        check_out_date: formatDate(effectiveCheckOut) || "",
      },
    });
  };

  return (
    <View className="flex-1 bg-[#faf8f3]">
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* ── HEADER ── */}
      <LinearGradient
        colors={["#0d2e1f", "#1a4a35"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 12, paddingBottom: 28, paddingHorizontal: 24 }}
      >
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          className="w-10 h-10 rounded-full bg-white/10 border border-white/10 justify-center items-center mb-6"
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Room title */}
        <Text className="text-[#c9a96e] text-[10px] tracking-[4px] uppercase mb-1">
          {parsedRoom.room_type?.type_name}
        </Text>
        <Text
          className="text-white text-4xl mb-1"
          style={{ fontFamily: "Georgia" }}
        >
          Room {parsedRoom.room_number}
        </Text>
        <Text
          className="text-white/40 text-sm"
          style={{ fontFamily: "Georgia", fontStyle: "italic" }}
        >
          {formatPrice(parsedRoom.room_type?.base_price)} per night
        </Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
      >
        <View className="px-6 pt-8">

          {/* ── SECTION LABEL ── */}
          <Text className="text-[#1a4a35]/40 text-[10px] tracking-[3px] uppercase mb-3">
            Booking Type
          </Text>

          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity
              onPress={() => {
                setBookingType("short");
                // reset dates when switching modes so stale selections don't carry over
                setCheckInDate(null);
                setCheckOutDate(null);
              }}
              className={`flex-1 py-3 rounded-xl ${bookingType === "short" ? "bg-[#1a4a35]" : "bg-gray-200"
                }`}
            >
              <Text className={`text-center ${bookingType === "short" ? "text-white" : "text-black"}`}>
                Short Time
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setBookingType("overnight");
                setCheckInDate(null);
                setCheckOutDate(null);
              }}
              className={`flex-1 py-3 rounded-xl ${bookingType === "overnight" ? "bg-[#1a4a35]" : "bg-gray-200"
                }`}
            >
              <Text className={`text-center ${bookingType === "overnight" ? "text-white" : "text-black"}`}>
                Overnight
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── DATE CARDS ── */}
          <View className="gap-4 mb-8">

            {/* Check-in (used as the single "Date" card for short stay) */}
            <TouchableOpacity
              onPress={() => setShowCheckIn(true)}
              activeOpacity={0.85}
              className="bg-white rounded-2xl border border-[#1a4a35]/08 overflow-hidden"
            >
              <View className="px-5 py-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="w-9 h-9 rounded-full bg-[#1a4a35]/06 justify-center items-center">
                      <Ionicons
                        name={bookingType === "short" ? "calendar-outline" : "enter-outline"}
                        size={16}
                        color="#1a4a35"
                      />
                    </View>
                    <View>
                      <Text className="text-[#1a4a35]/40 text-[10px] tracking-widest uppercase mb-0.5">
                        {bookingType === "short" ? "Date" : "Check-in"}
                      </Text>
                      {checkInDate ? (
                        <Text
                          className="text-[#1a4a35] text-base"
                          style={{ fontFamily: "Georgia" }}
                        >
                          {formatDisplayDate(checkInDate)}
                        </Text>
                      ) : (
                        <Text className="text-[#1a4a35]/30 text-sm">
                          Select date
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#1a4a35" style={{ opacity: 0.3 }} />
                </View>
              </View>
              {checkInDate && (
                <View className="h-0.5 bg-[#1a4a35]/05 mx-5" />
              )}
              {checkInDate && (
                <View className="px-5 py-2">
                  <Text className="text-[#c9a96e] text-xs tracking-wide">
                    {formatDate(checkInDate)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Check-out is only relevant for overnight stays */}
            {bookingType === "overnight" && (
              <>
                {/* Arrow connector */}
                <View className="items-center">
                  <View className="w-px h-4 bg-[#1a4a35]/10" />
                  <View className="w-6 h-6 rounded-full bg-[#1a4a35]/06 border border-[#1a4a35]/10 justify-center items-center">
                    <Ionicons name="arrow-down" size={12} color="#1a4a35" />
                  </View>
                  <View className="w-px h-4 bg-[#1a4a35]/10" />
                </View>

                {/* Check-out */}
                <TouchableOpacity
                  onPress={() => setShowCheckOut(true)}
                  activeOpacity={0.85}
                  className="bg-white rounded-2xl border border-[#1a4a35]/08 overflow-hidden"
                >
                  <View className="px-5 py-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-3">
                        <View className="w-9 h-9 rounded-full bg-[#1a4a35]/06 justify-center items-center">
                          <Ionicons name="exit-outline" size={16} color="#1a4a35" />
                        </View>
                        <View>
                          <Text className="text-[#1a4a35]/40 text-[10px] tracking-widest uppercase mb-0.5">
                            Check-out
                          </Text>
                          {checkOutDate ? (
                            <Text
                              className="text-[#1a4a35] text-base"
                              style={{ fontFamily: "Georgia" }}
                            >
                              {formatDisplayDate(checkOutDate)}
                            </Text>
                          ) : (
                            <Text className="text-[#1a4a35]/30 text-sm">
                              Select date
                            </Text>
                          )}
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#1a4a35" style={{ opacity: 0.3 }} />
                    </View>
                  </View>
                  {checkOutDate && (
                    <View className="h-0.5 bg-[#1a4a35]/05 mx-5" />
                  )}
                  {checkOutDate && (
                    <View className="px-5 py-2">
                      <Text className="text-[#c9a96e] text-xs tracking-wide">
                        {formatDate(checkOutDate)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Short stay hint under the calendar */}
            {bookingType === "short" && shortStayPrice > 0 && (
              <Text className="text-xs text-[#1a4a35]/50 -mt-1 px-1">
                Short stay rate: {formatPrice(shortStayPrice)} for the selected date
              </Text>
            )}
          </View>

          {/* Date pickers */}
          {showCheckIn && (
            <DateTimePicker
              value={checkInDate || new Date()}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(event, date) => {
                setShowCheckIn(Platform.OS === "ios");
                if (date) setCheckInDate(date);
              }}
            />
          )}
          {showCheckOut && bookingType === "overnight" && (
            <DateTimePicker
              value={checkOutDate || new Date()}
              mode="date"
              display="default"
              minimumDate={checkInDate || new Date()}
              onChange={(event, date) => {
                setShowCheckOut(Platform.OS === "ios");
                if (date) setCheckOutDate(date);
              }}
            />
          )}

          {/* ── SUMMARY CARD ── */}
          {canBook ? (
            <View className="bg-white rounded-2xl border border-[#1a4a35]/08 overflow-hidden">
              <View className="px-5 pt-5 pb-4">
                <Text className="text-[#1a4a35]/40 text-[10px] tracking-[3px] uppercase mb-4">
                  Booking summary
                </Text>

                {/* Summary based on booking type */}
                {bookingType === "overnight" ? (
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="moon-outline" size={14} color="#1a4a35" />
                      <Text className="text-[#1a4a35]/60 text-sm">
                        {nights} {nights === 1 ? "night" : "nights"}
                      </Text>
                    </View>
                    <Text className="text-[#1a4a35]/60 text-sm">
                      {formatPrice(parsedRoom.room_type?.base_price)} × {nights}
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="calendar-outline" size={14} color="#1a4a35" />
                      <Text className="text-[#1a4a35]/60 text-sm">
                        {formatDisplayDate(checkInDate)}
                      </Text>
                    </View>
                    <Text className="text-[#1a4a35]/60 text-sm">
                      {formatPrice(shortStayPrice)}
                    </Text>
                  </View>
                )}

                <View className="h-px bg-[#1a4a35]/06 mb-3" />

                {/* Total */}
                <View className="flex-row justify-between items-center">
                  <Text
                    className="text-[#1a4a35] text-base"
                    style={{ fontFamily: "Georgia" }}
                  >
                    Total
                  </Text>
                  <Text
                    className="text-[#1a4a35] text-2xl"
                    style={{ fontFamily: "Georgia" }}
                  >
                    {formatPrice(total)}
                  </Text>
                </View>
              </View>

              {/* Gold accent bar */}
              <View className="h-1 bg-[#c9a96e]/30">
                <View className="h-full w-full bg-[#c9a96e]" style={{ width: "100%" }} />
              </View>
            </View>
          ) : (
            /* Placeholder hint */
            <View className="bg-[#1a4a35]/04 rounded-2xl border border-dashed border-[#1a4a35]/15 px-5 py-6 items-center gap-2">
              <Ionicons name="calendar-outline" size={24} color="#1a4a35" style={{ opacity: 0.3 }} />
              <Text className="text-[#1a4a35]/30 text-sm text-center leading-5">
                {bookingType === "overnight"
                  ? "Select both dates to see\n your booking summary"
                  : !shortStayPrice
                    ? "Short stay pricing not available\n for this room"
                    : "Select a date to see\n your booking summary"}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── CONFIRM CTA ── */}
      <View
        className="absolute bottom-0 left-0 right-0 px-6 bg-[#faf8f3] border-t border-[#1a4a35]/08"
        style={{ paddingBottom: insets.bottom + 16, paddingTop: 16 }}
      >
        {canBook && (
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[#1a4a35]/40 text-xs tracking-widest uppercase">
              Total
            </Text>
            <Text
              className="text-[#1a4a35] text-xl"
              style={{ fontFamily: "Georgia" }}
            >
              {formatPrice(total)}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleBooking}
          disabled={loading || !canBook}
          activeOpacity={0.85}
          className="rounded-2xl overflow-hidden"
        >
          <LinearGradient
            colors={
              loading
                ? ["#9ca3af", "#6b7280"]
                : !canBook
                  ? ["#d1d5db", "#9ca3af"]
                  : ["#1a4a35", "#0d2e1f"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="flex-row items-center justify-center py-4 gap-2"
          >
            {loading ? (
              <Text
                className="text-white text-sm tracking-widest uppercase"
                style={{ fontFamily: "Georgia" }}
              >
                Processing...
              </Text>
            ) : (
              <>
                <Text
                  className="text-white text-sm tracking-widest uppercase"
                  style={{ fontFamily: "Georgia" }}
                >
                  {canBook ? "Confirm Booking" :
                    (bookingType === "short" && !shortStayPrice)
                      ? "Pricing Unavailable"
                      : "Select Dates First"}
                </Text>
                {canBook && (
                  <Ionicons name="checkmark" size={16} color="#c9a96e" />
                )}
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}