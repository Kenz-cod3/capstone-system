import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  BackHandler,
  Modal,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";

import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import api from "@/services/api";
import * as WebBrowser from "expo-web-browser";

import ReceiptModal from "./Receiptmodal";

type CreatedBooking = {
  id: number;
  total_price: number | string;
  [key: string]: any;
};

export default function PaymentPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [paymentMethod, setPaymentMethod] = useState<"gcash" | "bank">("gcash");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptBookingId, setReceiptBookingId] = useState<number | null>(null);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (processing || paymentSuccess) {
          return true;
        }

        return false;
      },
    );

    return () => backHandler.remove();
  }, [processing, paymentSuccess]);

  // Poll booking(s) until confirmed by the webhook, or time out
  const waitForConfirmation = async (bookingIds: number[]) => {
    const maxAttempts = 20; // ~40s at 2s interval
    for (let i = 0; i < maxAttempts; i++) {
      const results = await Promise.all(
        bookingIds.map((id) => api.get(`/bookings/${id}`)),
      );

      const allPaid = results.every((res) =>
        res.data?.payments?.some(
          (payment: any) => payment.payment_status === "paid",
        ),
      );

      if (allPaid) {
        return true;
      }

      await new Promise((r) => setTimeout(r, 2000));
    }
    return false;
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setProcessing(true);

      const isMultiple = params.multiple === "true";
      console.log("========== PAYMENT DEBUG ==========");
      console.log("PARAMS:");
      console.log(JSON.stringify(params, null, 2));
      console.log("IS MULTIPLE:", isMultiple);
      let bookingIds: number[] = [];
      let totalAmount = 0;

      // 1. CREATE BOOKING(S) AS PENDING
      if (isMultiple) {
        const rooms = JSON.parse(params.rooms as string);

        const payload = {
          payment_method: paymentMethod,

          rooms: rooms.map((room: any) => ({
            room_id: room.id,
            stay_type: room.stay_type,
            check_in_date: room.check_in_date,
            check_out_date: room.check_out_date,
          })),
        };

        const res = await api.post("/bookings", payload);

        console.log("PAYLOAD:");
        console.log(JSON.stringify(payload, null, 2));

        const booking = res.data.data;

        bookingIds = [booking.id];

        setReceiptBookingId(booking.id);

        totalAmount = Number(booking.total_price);
      } else {
        // const payload: any = {
        //   booking_type: params.booking_type,
        //   room_ids: [Number(params.room_id)],
        //   payment_method: paymentMethod,
        // };

        // if (params.booking_type === "overnight") {
        //   payload.check_in_date = params.check_in_date;
        //   payload.check_out_date = params.check_out_date;
        // } else {
        //   payload.hours = Number(params.hours);
        // }

        // const res = await api.post("/bookings", payload);
        const payload = {
          payment_method: paymentMethod,

          rooms: [
            {
              room_id: Number(params.room_id),

              stay_type:
                params.booking_type === "overnight"
                  ? "overnight"
                  : "short_stay",

              check_in_date: params.check_in_date,

              check_out_date:
                params.booking_type === "overnight"
                  ? params.check_out_date
                  : params.check_in_date,
            },
          ],
        };

        console.log("SINGLE PAYLOAD:");
        console.log(JSON.stringify(payload, null, 2));

        const res = await api.post("/bookings", payload);
        const created: CreatedBooking = res.data.data;

        if (!created || created.length === 0) {
          throw new Error("No booking was created");
        }

        bookingIds = [created.id];

        setReceiptBookingId(created.id);

        totalAmount = Number(created.total_price);
      }

      if (!bookingIds.length || !totalAmount || Number.isNaN(totalAmount)) {
        throw new Error("Could not determine booking amount");
      }

      console.log("Booking IDs:", bookingIds);
      console.log("Total Amount:", totalAmount);

      const sessionRes = await api.post("/paymongo/create-payment", {
        booking_id: bookingIds[0],
        amount: totalAmount,
        payment_method: paymentMethod,
      });

      await WebBrowser.openBrowserAsync(sessionRes.data.checkout_url);

      // 3. WAIT FOR WEBHOOK TO CONFIRM
      const confirmed = await waitForConfirmation(bookingIds);

      if (!confirmed) {
        setProcessing(false);
        setLoading(false);

        alert(
          "We couldn't confirm your payment yet. Check your bookings shortly.",
        );

        return;
      }

      setProcessing(false);
      setLoading(false);
      setPaymentSuccess(true);

      return;
    } catch (err: any) {
      console.log("ERROR:");
      console.log(err);

      console.log("STATUS:", err.response?.status);
      console.log("DATA:", JSON.stringify(err.response?.data, null, 2));
      console.log("MESSAGE:", err.message);

      setProcessing(false);
      setLoading(false);

      alert(err.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View className="flex-1 bg-[#faf8f3]">
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="dark-content"
        />

        <LinearGradient
          colors={["#0d2e1f", "#1a4a35"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 12,
            paddingBottom: 28,
            paddingHorizontal: 24,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              if (!loading && !paymentSuccess) router.back();
            }}
            className="w-10 h-10 rounded-full bg-white/10 justify-center items-center mb-6"
            style={{ opacity: loading || paymentSuccess ? 0.5 : 1 }}
            disabled={loading || paymentSuccess}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>

          <Text className="text-[#c9a96e] text-[10px] tracking-[4px] uppercase mb-1">
            Payment
          </Text>
          <Text
            className="text-white text-4xl"
            style={{ fontFamily: "Georgia" }}
          >
            Select Method
          </Text>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6 pt-8">
            <TouchableOpacity
              onPress={() => setPaymentMethod("gcash")}
              activeOpacity={0.85}
              disabled={loading || paymentSuccess}
              className={`rounded-2xl border p-5 mb-4 flex-row items-center justify-between ${paymentMethod === "gcash" ? "bg-[#1a4a35] border-[#1a4a35]" : "bg-white border-[#1a4a35]/10"} ${loading || paymentSuccess ? "opacity-50" : ""}`}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className={`w-12 h-12 rounded-full justify-center items-center ${paymentMethod === "gcash" ? "bg-white/10" : "bg-[#1a4a35]/05"}`}
                >
                  <Ionicons
                    name="phone-portrait-outline"
                    size={22}
                    color={paymentMethod === "gcash" ? "#fff" : "#1a4a35"}
                  />
                </View>
                <View>
                  <Text
                    className={`${paymentMethod === "gcash" ? "text-white" : "text-[#1a4a35]"} text-lg`}
                    style={{ fontFamily: "Georgia" }}
                  >
                    GCash
                  </Text>
                  <Text
                    className={`${paymentMethod === "gcash" ? "text-white/60" : "text-[#1a4a35]/40"} text-xs`}
                  >
                    Mobile Payment
                  </Text>
                </View>
              </View>
              {paymentMethod === "gcash" && (
                <Ionicons name="checkmark-circle" size={24} color="#c9a96e" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPaymentMethod("bank")}
              activeOpacity={0.85}
              disabled={loading || paymentSuccess}
              className={`rounded-2xl border p-5 flex-row items-center justify-between ${paymentMethod === "bank" ? "bg-[#1a4a35] border-[#1a4a35]" : "bg-white border-[#1a4a35]/10"} ${loading || paymentSuccess ? "opacity-50" : ""}`}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className={`w-12 h-12 rounded-full justify-center items-center ${paymentMethod === "bank" ? "bg-white/10" : "bg-[#1a4a35]/05"}`}
                >
                  <Ionicons
                    name="card-outline"
                    size={22}
                    color={paymentMethod === "bank" ? "#fff" : "#1a4a35"}
                  />
                </View>
                <View>
                  <Text
                    className={`${paymentMethod === "bank" ? "text-white" : "text-[#1a4a35]"} text-lg`}
                    style={{ fontFamily: "Georgia" }}
                  >
                    Bank Transfer
                  </Text>
                  <Text
                    className={`${paymentMethod === "bank" ? "text-white/60" : "text-[#1a4a35]/40"} text-xs`}
                  >
                    Online Banking
                  </Text>
                </View>
              </View>
              {paymentMethod === "bank" && (
                <Ionicons name="checkmark-circle" size={24} color="#c9a96e" />
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View
          className="absolute bottom-0 left-0 right-0 px-6 bg-[#faf8f3] border-t border-[#1a4a35]/08"
          style={{ paddingBottom: insets.bottom + 16, paddingTop: 16 }}
        >
          <TouchableOpacity
            onPress={handlePayment}
            disabled={loading || paymentSuccess}
            activeOpacity={0.85}
            className="rounded-2xl overflow-hidden"
          >
            <LinearGradient
              colors={["#1a4a35", "#0d2e1f"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="flex-row items-center justify-center py-4 gap-2"
            >
              <Text
                className="text-white text-sm tracking-widest uppercase"
                style={{ fontFamily: "Georgia" }}
              >
                {loading
                  ? "Processing..."
                  : paymentSuccess
                    ? "Completed ✓"
                    : "Pay Now"}
              </Text>
              {!loading && !paymentSuccess && (
                <Ionicons name="arrow-forward" size={16} color="#c9a96e" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* PROCESSING / SUCCESS SHEET — matches EditProfileModal's design system */}
      <Modal
        visible={processing || paymentSuccess}
        transparent
        animationType="slide"
        statusBarTranslucent
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
            className="bg-white rounded-t-3xl px-6 pt-3 pb-8"
            style={{ height: Dimensions.get("window").height * 0.55 }}
          >
            {/* drag handle */}
            <View
              style={{
                width: 44,
                height: 5,
                borderRadius: 3,
                backgroundColor: "#e2e2e2",
                alignSelf: "center",
                marginBottom: 12,
              }}
            />

            <View className="flex-1 justify-center items-center">
              {processing ? (
                <>
                  <Ionicons name="paper-plane" size={90} color="#22c55e" />

                  <Text className="text-[#141414] text-2xl font-bold mt-6">
                    Processing...
                  </Text>

                  <Text className="text-[#8a8a8a] text-base mt-2 text-center">
                    Your payment is being processed{"\n"}please wait a moment.
                  </Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={100}
                    color="#22c55e"
                  />

                  <Text className="text-[#141414] text-2xl font-bold mt-6">
                    Success!
                  </Text>

                  <Text className="text-[#8a8a8a] text-base mt-2 text-center">
                    Your payment was successful.
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      setPaymentSuccess(false);
                      setShowReceipt(true);
                    }}
                    activeOpacity={0.85}
                    className="bg-[#141414] rounded-full mt-8"
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 40,
                    }}
                  >
                    <Text className="text-white text-center font-bold">
                      View Receipt
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
      <ReceiptModal
        visible={showReceipt}
        bookingId={receiptBookingId}
        onClose={() => {
          setShowReceipt(false);
          setPaymentSuccess(false);

          router.dismissAll();

          router.replace({
            pathname: "/(guest)/(tabs)/home",
            params: {
              fromPayment: "true",
            },
          });
        }}
      />
    </>
  );
}
