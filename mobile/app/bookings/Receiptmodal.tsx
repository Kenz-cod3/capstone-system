import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Modal,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import api from "@/services/api";

export interface ReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: number | string | null;
}

type ReceiptData = {
  receipt_number?: string;
  amount: number | string;
  payment_date: string;
  payment_method: "cash" | "gcash" | "bank_transfer" | string;
  gcash_reference?: string | null;
  bank_reference?: string | null;
  receiver?: { first_name: string; last_name: string } | null;
  booking?: {
    booking_reference?: string;
    bookedRooms?: {
      subtotal: number | string;
      room?: { room_number?: string };
    }[];
    addOns?: {
      add_on_name: string;
      pivot?: { quantity?: number; subtotal?: number | string };
    }[];
  };
};

export default function ReceiptModal({
  visible,
  onClose,
  bookingId,
}: ReceiptModalProps) {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (visible && bookingId) {
      loadReceipt();
    }
    if (!visible) {
      // reset so the next open always fetches fresh
      setReceipt(null);
      setError(false);
    }
  }, [visible, bookingId]);

  const loadReceipt = async () => {
    if (!bookingId) return;
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/bookings/${bookingId}/receipt`);
      setReceipt(res.data);
    } catch (err) {
      console.log(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    return `₱${Number(amount).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const paymentMethodLabel = (method: string) => {
    switch (method) {
      case "gcash":
        return "GCash";
      case "bank_transfer":
      case "bank":
        return "Bank Transfer";
      default:
        return "Cash";
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <BlurView
        intensity={20}
        tint="dark"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
        }}
      />

      <View className="flex-1 justify-end">
        <View
          className="bg-[#faf8f3] rounded-t-3xl overflow-hidden"
          style={{ maxHeight: Dimensions.get("window").height * 0.90 }}
        >
          {/* drag handle */}
          <View
            style={{
              width: 44,
              height: 5,
              borderRadius: 3,
              backgroundColor: "#e2e2e2",
              alignSelf: "center",
              marginTop: 12,
              marginBottom: 4,
            }}
          />

          {/* Header */}
          <LinearGradient
            colors={["#0d2e1f", "#1a4a35"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingTop: 16,
              paddingBottom: 20,
              paddingHorizontal: 24,
            }}
          >
            <Text className="text-[#c9a96e] text-[10px] tracking-[4px] uppercase mb-1 text-center">
              Official Receipt
            </Text>
            <Text
              className="text-white text-2xl text-center"
              style={{ fontFamily: "Georgia" }}
            >
              Lynn Ennia Travelers Inn
            </Text>
          </LinearGradient>

          {loading ? (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator size="large" color="#1a4a35" />
              <Text className="text-[#8a8a8a] mt-4">Loading receipt...</Text>
            </View>
          ) : error || !receipt ? (
            <View className="py-16 items-center justify-center px-6">
              <Ionicons name="alert-circle-outline" size={40} color="#c0392b" />
              <Text className="text-[#141414] text-base font-semibold mt-4">
                Receipt unavailable
              </Text>
              <Text className="text-[#8a8a8a] text-sm mt-1 text-center">
                We couldn't load this receipt. Please try again.
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Transaction details */}
              <View className="border-b border-dashed border-[#1a4a35]/20 pb-4 mb-4">
                <ReceiptRow
                  label="Receipt No."
                  value={receipt.receipt_number || "-"}
                  strong
                />
                <ReceiptRow
                  label="Booking Ref."
                  value={receipt.booking?.booking_reference || "-"}
                  strong
                />
                <ReceiptRow
                  label="Date"
                  value={formatDate(receipt.payment_date)}
                />
                <ReceiptRow
                  label="Payment Method"
                  value={paymentMethodLabel(receipt.payment_method)}
                />
                {receipt.payment_method === "gcash" &&
                  receipt.gcash_reference && (
                    <ReceiptRow
                      label="GCash Ref."
                      value={receipt.gcash_reference}
                    />
                  )}
                {receipt.payment_method === "bank" &&
                  receipt.bank_reference && (
                    <ReceiptRow
                      label="Bank Ref."
                      value={receipt.bank_reference}
                    />
                  )}
              </View>

              {/* Room charges */}
              {receipt.booking?.bookedRooms &&
                receipt.booking.bookedRooms.length > 0 && (
                  <View className="border-b border-dashed border-[#1a4a35]/20 pb-4 mb-4">
                    <Text className="text-[#8a8a8a] text-[11px] tracking-widest uppercase mb-2">
                      Room Charges
                    </Text>
                    {receipt.booking.bookedRooms.map((room, index) => (
                      <ReceiptRow
                        key={index}
                        label={room.room?.room_number || `Room ${index + 1}`}
                        value={formatCurrency(room.subtotal)}
                      />
                    ))}
                  </View>
                )}

              {/* Add-ons */}
              {receipt.booking?.addOns && receipt.booking.addOns.length > 0 && (
                <View className="border-b border-dashed border-[#1a4a35]/20 pb-4 mb-4">
                  <Text className="text-[#8a8a8a] text-[11px] tracking-widest uppercase mb-2">
                    Add-ons
                  </Text>
                  {receipt.booking.addOns.map((addon, index) => (
                    <ReceiptRow
                      key={index}
                      label={`${addon.add_on_name} x${addon.pivot?.quantity || 1}`}
                      value={formatCurrency(addon.pivot?.subtotal || 0)}
                    />
                  ))}
                </View>
              )}

              {/* Total */}
              <View className="flex-row justify-between items-center mb-2">
                <Text
                  className="text-[#141414] text-sm tracking-widest uppercase"
                  style={{ fontFamily: "Georgia" }}
                >
                  Total Amount
                </Text>
                <Text
                  className="text-[#1a4a35] text-2xl"
                  style={{ fontFamily: "Georgia" }}
                >
                  {formatCurrency(receipt.amount)}
                </Text>
              </View>

              <Text className="text-[#8a8a8a] text-xs text-center mt-6 mb-4">
                Thank you for staying with us.
              </Text>
            </ScrollView>
          )}

          {/* Close button */}
          <View className="px-6 pb-8 pt-4 bg-[#faf8f3] border-t border-[#1a4a35]/08">
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              className="rounded-2xl overflow-hidden"
            >
              <LinearGradient
                colors={["#1a4a35", "#0d2e1f"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="flex-row items-center justify-center py-4"
              >
                <Text
                  className="text-white text-sm tracking-widest uppercase"
                  style={{ fontFamily: "Georgia" }}
                >
                  Done
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ReceiptRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View className="flex-row justify-between items-center mb-1.5">
      <Text className="text-[#8a8a8a] text-[13px]">{label}</Text>
      <Text
        className={`text-[13px] text-[#141414] ${strong ? "font-semibold" : ""}`}
      >
        {value}
      </Text>
    </View>
  );
}
