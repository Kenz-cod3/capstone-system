import {
  View,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import api from "@/services/api";

export default function CreateBooking() {
  const { room } = useLocalSearchParams();
  const router = useRouter();

  const parsedRoom = room ? JSON.parse(room as string) : null;

  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);

  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);

  const [loading, setLoading] = useState(false);

  if (!parsedRoom) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <Text>No room selected</Text>
      </SafeAreaView>
    );
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toISOString().split("T")[0];
  };

  const handleBooking = async () => {
    if (!checkInDate || !checkOutDate) {
      alert("Please select dates");
      return;
    }

    if (checkOutDate <= checkInDate) {
      alert("Check-out must be after check-in");
      return;
    }

    try {
      setLoading(true);

      const nights =
        (checkOutDate.getTime() - checkInDate.getTime()) /
        (1000 * 60 * 60 * 24);

      const total =
        nights * parsedRoom.room_type?.base_price;

      await api.post("/bookings", {
        check_in_date: formatDate(checkInDate),
        check_out_date: formatDate(checkOutDate),
        total_price: total,
        room_ids: [parsedRoom.id],
      });

      alert("Booking Successful ✅");

      router.replace("/(tabs)/home");

    } catch (err: any) {
      alert(err.response?.data?.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white p-4">

      {/* 🏨 ROOM INFO */}
      <Text className="text-2xl font-bold mb-1">
        Room {parsedRoom.room_number}
      </Text>

      <Text className="text-gray-500 mb-4">
        ₱{parsedRoom.room_type?.base_price} / night
      </Text>

      {/* 📅 CHECK-IN */}
      <Text className="mb-1 font-semibold">Check-in</Text>
      <TouchableOpacity
        onPress={() => setShowCheckIn(true)}
        className="border border-gray-300 rounded-xl p-3 mb-4"
      >
        <Text>
          {checkInDate ? formatDate(checkInDate) : "Select date"}
        </Text>
      </TouchableOpacity>

      {showCheckIn && (
        <DateTimePicker
          value={checkInDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowCheckIn(Platform.OS === "ios");
            if (date) setCheckInDate(date);
          }}
        />
      )}

      {/* 📅 CHECK-OUT */}
      <Text className="mb-1 font-semibold">Check-out</Text>
      <TouchableOpacity
        onPress={() => setShowCheckOut(true)}
        className="border border-gray-300 rounded-xl p-3 mb-4"
      >
        <Text>
          {checkOutDate ? formatDate(checkOutDate) : "Select date"}
        </Text>
      </TouchableOpacity>

      {showCheckOut && (
        <DateTimePicker
          value={checkOutDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowCheckOut(Platform.OS === "ios");
            if (date) setCheckOutDate(date);
          }}
        />
      )}

      {/* 💰 TOTAL */}
      {checkInDate && checkOutDate && checkOutDate > checkInDate && (
        <Text className="text-lg font-semibold mb-4 text-blue-600">
          Total: ₱
          {(
            ((checkOutDate.getTime() - checkInDate.getTime()) /
              (1000 * 60 * 60 * 24)) *
            parsedRoom.room_type?.base_price
          ).toFixed(2)}
        </Text>
      )}

      {/* 🔘 BUTTON */}
      <TouchableOpacity
        onPress={handleBooking}
        disabled={loading}
        className={`py-4 rounded-xl ${
          loading ? "bg-gray-400" : "bg-blue-600"
        }`}
      >
        <Text className="text-white text-center font-semibold text-lg">
          {loading ? "Processing..." : "Confirm Booking"}
        </Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}