import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  BackHandler,
  Modal,
  Dimensions,
  Image,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import * as WebBrowser from "expo-web-browser";

import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import api from "@/services/api";

import ReceiptModal from "./Receiptmodal";

type CreatedBooking = {
  id: number;
  total_price: number | string;
  booking_reference?: string;
  [key: string]: any;
};

const PAYMENT_WINDOW_SECONDS = 30 * 60; // 30 min — matches PayMongo QR Ph default
const POLL_INTERVAL_MS = 5000;

const formatCountdown = (totalSeconds: number) => {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export default function PaymentPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  // ✅ Detect if this is a "Continue Payment" flow from Bookings tab
  const isExistingBooking = params.existing === "true";

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptBookingId, setReceiptBookingId] = useState<number | null>(null);

  // ---- QR Ph modal state ----
  const [showQr, setShowQr] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrTestUrl, setQrTestUrl] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [clientKey, setClientKey] = useState<string | null>(null);
  const [qrAmount, setQrAmount] = useState<number>(0);
  const [qrStatus, setQrStatus] = useState<
    "loading_qr" | "waiting" | "confirmed" | "expired" | "error"
  >("loading_qr");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(PAYMENT_WINDOW_SECONDS);

  const pollingRef = useRef(false);
  const successFiredRef = useRef(false);

  /* ------------------------------------------------------------------ */
  /* Block hardware back button while things are in flight               */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (processing || paymentSuccess || showQr) return true;
        return false;
      },
    );

    return () => {
      backHandler.remove();
      pollingRef.current = false;
    };
  }, [processing, paymentSuccess, showQr]);

  /* ------------------------------------------------------------------ */
  /* Countdown while QR is on screen                                     */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!showQr || qrStatus !== "waiting") return;

    if (secondsLeft <= 0) {
      setQrStatus("expired");
      pollingRef.current = false;
      return;
    }

    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, showQr, qrStatus]);

  /* ------------------------------------------------------------------ */
  /* Poll PayMongo status while waiting                                  */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!showQr || qrStatus !== "waiting" || !paymentIntentId || !clientKey) {
      return;
    }

    pollingRef.current = true;

    const interval = setInterval(async () => {
      if (!pollingRef.current) return;

      try {
        const res = await api.get(`/paymongo/qr/status/${paymentIntentId}`, {
          params: { client_key: clientKey },
        });

        const st = res.data?.status;

        console.log("QR STATUS:", st);

        if (st === "succeeded") {
          pollingRef.current = false;
          clearInterval(interval);
          setQrStatus("confirmed");

          if (!successFiredRef.current) {
            successFiredRef.current = true;
            setTimeout(() => {
              setShowQr(false);
              setPaymentSuccess(true);
            }, 900);
          }
        } else if (
          st === "awaiting_payment_method" ||
          st === "canceled" ||
          st === "expired"
        ) {
          pollingRef.current = false;
          clearInterval(interval);
          setQrStatus("expired");
        }
      } catch (e) {
        console.log("QR STATUS POLL ERROR:", e);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      pollingRef.current = false;
    };
  }, [showQr, qrStatus, paymentIntentId, clientKey]);

  /* ------------------------------------------------------------------ */
  /* Generate (or regenerate) QR                                         */
  /* ------------------------------------------------------------------ */
  const generateQr = async (bookingId: number, amount: number) => {
    setQrStatus("loading_qr");
    setStatusError(null);
    setQrImageUrl(null);

    try {
      const res = await api.post("/paymongo/qr/create", {
        booking_id: bookingId,
        amount,
      });

      const { qr_image_url, test_url, payment_intent_id, client_key } =
        res.data;

      if (!qr_image_url || !payment_intent_id || !client_key) {
        throw new Error("PayMongo did not return a QR code");
      }

      setQrImageUrl(qr_image_url);
      setQrTestUrl(test_url ?? null);
      setPaymentIntentId(payment_intent_id);
      setClientKey(client_key);
      setQrAmount(amount);
      setSecondsLeft(PAYMENT_WINDOW_SECONDS);
      setQrStatus("waiting");
    } catch (err: any) {
      console.log("CREATE QR ERROR:", err);
      setStatusError(
        err.response?.data?.message ||
          "Failed to generate QR code. Please try again.",
      );
      setQrStatus("error");
    }
  };

  /* ------------------------------------------------------------------ */
  /* MAIN — Pay Now button tapped                                        */
  /* ------------------------------------------------------------------ */
  const handlePayNow = async () => {
    try {
      setLoading(true);
      setProcessing(true);
      setStatusError(null);
      successFiredRef.current = false;

      let bookingId: number | null = null;
      let totalAmount = 0;

      /* =========================================================
         0. CONTINUE PAYMENT — existing booking, skip creation
      ========================================================= */
      if (isExistingBooking) {
        bookingId = Number(params.booking_id);
        totalAmount = Number(params.amount || 0);

        if (!bookingId || !totalAmount || Number.isNaN(totalAmount)) {
          throw new Error("Could not determine booking amount");
        }

        setReceiptBookingId(bookingId);

        setShowQr(true);
        setQrStatus("loading_qr");
        setProcessing(false);
        setLoading(false);

        await generateQr(bookingId, totalAmount);
        return;
      }

      /* =========================================================
         1. NEW MULTI-ROOM BOOKING
      ========================================================= */
      const isMultiple = params.multiple === "true";

      if (isMultiple) {
        const rooms = JSON.parse(params.rooms as string);

        const payload = {
          payment_method: "qrph",
          rooms: rooms.map((room: any) => ({
            room_id: room.id,
            stay_type:
              (room.stay_type ?? room.booking_type) === "overnight"
                ? "overnight"
                : "short_stay",
            check_in_date: room.check_in_date,
            check_out_date: room.check_out_date,
          })),
        };

        console.log("BOOKING PAYLOAD:", JSON.stringify(payload));
        const res = await api.post("/bookings", payload);
        const booking: CreatedBooking = res.data.data;

        bookingId = booking.id;
        totalAmount = Number(booking.total_price);
      } else {
        /* =========================================================
           2. NEW SINGLE-ROOM BOOKING
        ========================================================= */
        const payload = {
          payment_method: "qrph",
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

        const res = await api.post("/bookings", payload);
        const created: CreatedBooking = res.data.data;

        if (!created || !created.id) {
          throw new Error("No booking was created");
        }

        bookingId = created.id;
        totalAmount = Number(created.total_price);
      }

      if (!bookingId || !totalAmount || Number.isNaN(totalAmount)) {
        throw new Error("Could not determine booking amount");
      }

      setReceiptBookingId(bookingId);

      /* 3. OPEN MODAL + GENERATE QR ---------------------------------- */
      setShowQr(true);
      setQrStatus("loading_qr");
      setProcessing(false);
      setLoading(false);

      await generateQr(bookingId, totalAmount);
    } catch (err: any) {
      console.log("PAY NOW ERROR:", err);
      setProcessing(false);
      setShowQr(false);
      setLoading(false);

      alert(err.response?.data?.message || err.message || "Payment failed");
    }
  };

  /* ------------------------------------------------------------------ */
  /* Cancel — user closes QR modal                                       */
  /* ------------------------------------------------------------------ */
  const handleCancelQr = () => {
    pollingRef.current = false;
    setShowQr(false);
    setQrImageUrl(null);
    setPaymentIntentId(null);
    setClientKey(null);
    setQrStatus("loading_qr");
    setQrTestUrl(null);
  };

  /* ------------------------------------------------------------------ */
  /* Regenerate after expiry                                             */
  /* ------------------------------------------------------------------ */
  const handleRegenerate = async () => {
    if (!receiptBookingId) return;
    successFiredRef.current = false;
    await generateQr(receiptBookingId, qrAmount);
  };

  /* ------------------------------------------------------------------ */
  /* Test mode — open PayMongo's simulation page                         */
  /* ------------------------------------------------------------------ */
  const handleTestSimulate = async () => {
    if (!qrTestUrl) return;
    try {
      console.log("Opening PayMongo test URL:", qrTestUrl);
      await WebBrowser.openBrowserAsync(qrTestUrl);
    } catch (e) {
      console.log("Failed to open test URL:", e);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */
  return (
    <>
      <View className="flex-1 bg-[#faf8f3]">
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="dark-content"
        />

        {/* HEADER */}
        <LinearGradient
          colors={["#0d2e1f", "#1a4a35"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 12,
            paddingBottom: 28,
            paddingHorizontal: 24,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              position: "absolute",
              width: 240,
              height: 240,
              top: -60,
              right: -60,
              borderRadius: 120,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.05)",
            }}
          />

          <View
            style={{
              position: "absolute",
              width: 140,
              height: 140,
              top: -10,
              right: -10,
              borderRadius: 70,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.05)",
            }}
          />

          <TouchableOpacity
            onPress={() => {
              if (!loading && !paymentSuccess && !showQr) {
                router.back();
              }
            }}
            activeOpacity={0.8}
            className="w-10 h-10 rounded-full bg-white/10 justify-center items-center mb-6"
            style={{
              opacity: loading || paymentSuccess ? 0.5 : 1,
            }}
            disabled={loading || paymentSuccess || showQr}
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
            Pay via QR Ph
          </Text>
        </LinearGradient>

        {/* Body */}
        <ScrollView
          contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6 pt-8">
            {/* ✅ Show amount summary when continuing existing booking */}
            {isExistingBooking && params.amount && (
              <View className="rounded-2xl border border-[#1a4a35]/10 bg-white p-5 mb-4">
                <Text className="text-[#1a4a35]/40 text-xs tracking-widest uppercase mb-2">
                  Amount Due
                </Text>
                <Text
                  className="text-[#1a4a35] text-3xl font-bold"
                  style={{ fontFamily: "Georgia" }}
                >
                  ₱{Number(params.amount).toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            )}

            {/* QR Ph info card */}
            <View className="rounded-2xl border border-[#1a4a35]/10 bg-white p-5 mb-4">
              <View className="flex-row items-center gap-3 mb-4">
                <View className="w-12 h-12 rounded-full justify-center items-center bg-[#1a4a35]/05">
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={24}
                    color="#1a4a35"
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-[#1a4a35] text-lg"
                    style={{ fontFamily: "Georgia" }}
                  >
                    QR Ph
                  </Text>
                  <Text className="text-[#1a4a35]/40 text-xs">
                    One QR — works with any PH bank or e-wallet
                  </Text>
                </View>
              </View>

              <View className="border-t border-[#1a4a35]/08 pt-4 gap-2">
                {[
                  "GCash · Maya · ShopeePay",
                  "BPI · BDO · UnionBank · Metrobank · Landbank",
                  "InstaPay · PESONet",
                ].map((line) => (
                  <View key={line} className="flex-row items-center gap-2">
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={16}
                      color="#1a4a35"
                    />
                    <Text className="text-[#1a4a35]/70 text-xs">{line}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* How it works */}
            <View className="rounded-2xl border border-[#1a4a35]/10 bg-white p-5">
              <Text
                className="text-[#1a4a35] text-base mb-3"
                style={{ fontFamily: "Georgia" }}
              >
                How it works
              </Text>

              <View className="gap-3">
                {[
                  "Tap Pay Now to generate your QR code.",
                  "Open your banking or e-wallet app and scan the QR.",
                  "Confirm the payment — booking is confirmed automatically.",
                ].map((text, i) => (
                  <View key={i} className="flex-row items-start gap-3">
                    <View className="w-6 h-6 rounded-full bg-[#1a4a35] justify-center items-center">
                      <Text className="text-white text-xs font-bold">
                        {i + 1}
                      </Text>
                    </View>
                    <Text className="text-[#1a4a35]/70 text-xs flex-1 mt-1">
                      {text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Pay Now button */}
        <View
          className="absolute bottom-0 left-0 right-0 px-6 bg-[#faf8f3] border-t border-[#1a4a35]/08"
          style={{ paddingBottom: insets.bottom + 16, paddingTop: 16 }}
        >
          <TouchableOpacity
            onPress={handlePayNow}
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

      {/* QR Ph MODAL */}
      <Modal
        visible={showQr}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={handleCancelQr}
      >
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />

        <BlurView
          intensity={20}
          tint="dark"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <View className="flex-1 justify-end">
          <View
            className="bg-white rounded-t-3xl px-6 pt-3 pb-8"
            style={{ maxHeight: Dimensions.get("window").height * 0.92 }}
          >
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

            <ScrollView
              contentContainerStyle={{
                alignItems: "center",
                paddingVertical: 16,
                paddingBottom: insets.bottom + 16,
              }}
              showsVerticalScrollIndicator={false}
            >
              {qrStatus === "confirmed" ? (
                <>
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={100}
                    color="#22c55e"
                  />
                  <Text className="text-[#141414] text-2xl font-bold mt-6">
                    Payment Received
                  </Text>
                  <Text className="text-[#8a8a8a] text-sm mt-2 text-center">
                    Confirming your booking...
                  </Text>
                </>
              ) : qrStatus === "expired" ? (
                <>
                  <Ionicons name="time-outline" size={90} color="#c9a96e" />

                  <Text className="text-[#141414] text-xl font-bold mt-6">
                    QR Expired
                  </Text>

                  <Text className="text-[#8a8a8a] text-sm mt-2 text-center">
                    This QR code has expired.{"\n"}Generate a new one to try
                    again.
                  </Text>

                  <TouchableOpacity
                    onPress={handleRegenerate}
                    activeOpacity={0.85}
                    className="bg-[#1a4a35] rounded-full mt-8"
                    style={{ paddingVertical: 14, paddingHorizontal: 40 }}
                  >
                    <Text className="text-white font-bold">
                      Generate New QR
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleCancelQr}
                    activeOpacity={0.85}
                    className="mt-4"
                  >
                    <Text className="text-[#8a8a8a] text-sm">Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : qrStatus === "error" ? (
                <>
                  <Ionicons
                    name="alert-circle-outline"
                    size={80}
                    color="#ef4444"
                  />
                  <Text className="text-[#141414] text-xl font-bold mt-6">
                    Couldn't Load QR
                  </Text>
                  <Text className="text-[#8a8a8a] text-sm mt-2 text-center">
                    {statusError || "Something went wrong. Please try again."}
                  </Text>

                  <TouchableOpacity
                    onPress={handleRegenerate}
                    activeOpacity={0.85}
                    className="bg-[#1a4a35] rounded-full mt-8"
                    style={{ paddingVertical: 14, paddingHorizontal: 40 }}
                  >
                    <Text className="text-white font-bold">Try Again</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleCancelQr}
                    activeOpacity={0.85}
                    className="mt-4"
                  >
                    <Text className="text-[#8a8a8a] text-sm">Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text className="text-[#141414] text-2xl font-bold mb-1">
                    Scan to Pay
                  </Text>
                  <Text className="text-[#8a8a8a] text-sm text-center mb-5">
                    Open any PH bank or e-wallet app{"\n"}and scan the QR code
                    below
                  </Text>

                  {qrImageUrl ? (
                    <View
                      style={{
                        padding: 12,
                        borderRadius: 20,
                        backgroundColor: "#fff",
                        borderWidth: 1,
                        borderColor: "#1a4a3520",
                      }}
                    >
                      <Image
                        source={{ uri: qrImageUrl }}
                        style={{ width: 260, height: 260, borderRadius: 12 }}
                        resizeMode="contain"
                      />
                    </View>
                  ) : (
                    <View
                      style={{
                        width: 284,
                        height: 284,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <ActivityIndicator size="large" color="#1a4a35" />
                      <Text className="text-[#1a4a35]/60 text-xs mt-3">
                        Generating QR code…
                      </Text>
                    </View>
                  )}

                  <Text className="text-[#1a4a35] text-3xl font-bold mt-6">
                    ₱{qrAmount.toFixed(2)}
                  </Text>

                  {qrStatus === "waiting" && (
                    <>
                      <View className="flex-row items-center gap-3 mt-4">
                        <ActivityIndicator size="small" color="#1a4a35" />
                        <Text className="text-[#8a8a8a] text-xs">
                          Waiting for payment…
                        </Text>
                      </View>

                      <View className="flex-row items-center gap-2 rounded-2xl bg-[#eaf3ea] px-4 py-2.5 mt-4">
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color="#1a4a35"
                        />
                        <Text className="text-[#1a4a35]/70 text-[11px]">
                          Expires in{" "}
                        </Text>
                        <Text className="text-[#0d2e1f] text-sm font-bold">
                          {formatCountdown(secondsLeft)}
                        </Text>
                      </View>

                      <Text className="text-[#8a8a8a] text-[11px] text-center mt-5 px-4">
                        Keep this screen open. It will update automatically once
                        payment is confirmed.
                      </Text>
                    </>
                  )}

                  {qrTestUrl && qrStatus === "waiting" && (
                    <TouchableOpacity
                      onPress={handleTestSimulate}
                      activeOpacity={0.85}
                      className="mt-5 rounded-full bg-amber-100 px-5 py-2.5"
                    >
                      <Text className="text-amber-800 text-xs font-semibold">
                        🧪 Simulate Payment (Test Mode Only)
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={handleCancelQr}
                    activeOpacity={0.85}
                    className="mt-6"
                  >
                    <Text className="text-[#8a8a8a] text-sm">
                      Cancel payment
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PROCESSING / SUCCESS SHEET */}
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
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <View className="flex-1 justify-end">
          <View
            className="bg-white rounded-t-3xl px-6 pt-3 pb-8"
            style={{ height: Dimensions.get("window").height * 0.55 }}
          >
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
                    Preparing your booking...
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
                    style={{ paddingVertical: 14, paddingHorizontal: 40 }}
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
            params: { fromPayment: "true" },
          });
        }}
      />
    </>
  );
}