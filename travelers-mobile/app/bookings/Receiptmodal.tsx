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
  payment_method: "cash" | "gcash" | "bank_transfer" | "bank" | "qrph" | string;
  gcash_reference?: string | null;
  bank_reference?: string | null;
  receiver?: { first_name: string; last_name: string } | null;
  booking?: {
    booking_reference?: string;

    booked_rooms?: {
      subtotal: number | string;
      stay_type?: string;

      check_in_date?: string;
      check_out_date?: string;

      room?: {
        room_number?: string;

        room_type?: {
          type_name?: string;
        };
      };

      booking_add_ons?: {
        quantity?: number;
        subtotal?: number | string;

        add_on?: {
          add_on_name?: string;
        };
      }[];
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

      console.log("========== RECEIPT ==========");
      console.log(JSON.stringify(res.data, null, 2));
      console.log("RECEIPT payment_method:", res.data?.payment_method);

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

  const formatStayDate = (date?: string) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const paymentMethodLabel = (method?: string | null) => {
    switch (method) {
      case "gcash":
        return "GCash";
      case "bank_transfer":
      case "bank":
        return "Bank Transfer";
      case "qrph":
        return "QR Ph";
      case "cash":
        return "Cash";
      default:
        return "—";
    }
  };

  /* Which reference to display on the receipt (if any) */
  const getReferenceLabel = (method?: string | null) => {
    switch (method) {
      case "gcash":
        return "GCash Ref.";
      case "bank_transfer":
      case "bank":
        return "Bank Ref.";
      case "qrph":
        return "Reference No.";
      default:
        return null;
    }
  };

  const getReferenceValue = (data: ReceiptData) => {
    if (data.payment_method === "gcash") {
      return data.gcash_reference || null;
    }

    if (
      data.payment_method === "bank" ||
      data.payment_method === "bank_transfer" ||
      data.payment_method === "qrph"
    ) {
      return data.bank_reference || null;
    }

    return null;
  };

  const refLabel = receipt ? getReferenceLabel(receipt.payment_method) : null;
  const refValue = receipt ? getReferenceValue(receipt) : null;

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
          style={{ maxHeight: Dimensions.get("window").height * 0.9 }}
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

          {/* Header — plain, no gradient */}
          <View className="pt-4 pb-5 px-6 items-center">
            <Text className="text-[#c9a96e] text-[10px] tracking-[4px] uppercase mb-1 text-center">
              Official Receipt
            </Text>
            <Text
              className="text-[#0d2e1f] text-2xl text-center"
              style={{ fontFamily: "Georgia" }}
            >
              Lynn Ennia Travelers Inn
            </Text>
          </View>

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

                {refLabel && refValue && (
                  <ReceiptRow label={refLabel} value={refValue} />
                )}

                {receipt.receiver && (
                  <ReceiptRow
                    label="Received By"
                    value={`${receipt.receiver.first_name} ${receipt.receiver.last_name}`}
                  />
                )}
              </View>

              {/* Room charges */}
              {receipt.booking?.booked_rooms &&
                receipt.booking.booked_rooms.length > 0 && (
                  <View className="border-b border-dashed border-[#1a4a35]/20 pb-4 mb-4">
                    <Text className="text-[#8a8a8a] text-[11px] tracking-widest uppercase mb-2">
                      Room Charges
                    </Text>

                    {receipt.booking.booked_rooms.map((room, index) => (
                      <View
                        key={index}
                        className="mb-4 pb-3 border-b border-[#1a4a35]/10"
                      >
                        <ReceiptRow
                          label="Room Number"
                          value={room.room?.room_number || "-"}
                        />

                        <ReceiptRow
                          label="Room Type"
                          value={room.room?.room_type?.type_name || "-"}
                        />

                        <ReceiptRow
                          label="Stay Type"
                          value={
                            room.stay_type === "short_stay"
                              ? "Short Time"
                              : "Overnight"
                          }
                        />

                        <ReceiptRow
                          label="Check-in"
                          value={formatStayDate(room.check_in_date)}
                        />

                        <ReceiptRow
                          label="Check-out"
                          value={formatStayDate(room.check_out_date)}
                        />

                        <ReceiptRow
                          label="Room Charge"
                          value={formatCurrency(room.subtotal)}
                        />

                        {/* Add-ons (inside the same room block) */}
                        {room.booking_add_ons &&
                          room.booking_add_ons.length > 0 && (
                            <View className="mt-2 pt-2 border-t border-[#1a4a35]/10">
                              <Text className="text-[#8a8a8a] text-[10px] tracking-widest uppercase mb-1">
                                Add-ons
                              </Text>
                              {room.booking_add_ons.map((addon, i) => (
                                <ReceiptRow
                                  key={i}
                                  label={`${addon.add_on?.add_on_name || "Add-on"} x${addon.quantity ?? 1}`}
                                  value={formatCurrency(addon.subtotal ?? 0)}
                                />
                              ))}
                            </View>
                          )}
                      </View>
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

          {/* Close button — still uses the gradient since it's the primary action */}
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