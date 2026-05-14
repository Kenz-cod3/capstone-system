import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    StatusBar,
    ScrollView,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import api from "@/services/api";

export default function PaymentPage() {

    const router = useRouter();
    const insets = useSafeAreaInsets();

    const params = useLocalSearchParams();

    const [paymentMethod, setPaymentMethod] =
        useState<"gcash" | "bank">("gcash");

    const [gcashReference, setGcashReference] =
        useState("");

    const [bankReference, setBankReference] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const handlePayment = async () => {

        try {

            setLoading(true);

            const isMultiple =
                params.multiple === "true";

            // MULTIPLE BOOKING
            if (isMultiple) {

                const rooms =
                    JSON.parse(
                        params.rooms as string
                    );

                const bookingPromises =
                    rooms.map((room: any) => {

                        const payload: any = {

                            booking_type:
                                room.stay_type === "short_stay"
                                    ? "short"
                                    : "overnight",

                            room_ids: [room.id],

                            payment_method:
                                paymentMethod,

                            gcash_reference:
                                paymentMethod === "gcash"
                                    ? gcashReference
                                    : null,

                            bank_reference:
                                paymentMethod === "bank"
                                    ? bankReference
                                    : null,
                        };

                        // OVERNIGHT
                        if (
                            room.stay_type ===
                            "overnight"
                        ) {

                            payload.check_in_date =
                                room.check_in_date;

                            payload.check_out_date =
                                room.check_out_date;
                        }

                        // SHORT STAY
                        else {

                            payload.hours =
                                room.hours || 3;
                        }

                        return api.post(
                            "/bookings",
                            payload
                        );
                    });

                await Promise.all(
                    bookingPromises
                );
            }

            // SINGLE BOOKING
            else {

                const payload: any = {

                    booking_type:
                        params.booking_type,

                    room_ids: [
                        Number(params.room_id)
                    ],

                    payment_method:
                        paymentMethod,

                    gcash_reference:
                        paymentMethod === "gcash"
                            ? gcashReference
                            : null,

                    bank_reference:
                        paymentMethod === "bank"
                            ? bankReference
                            : null,
                };

                // OVERNIGHT
                if (
                    params.booking_type ===
                    "overnight"
                ) {

                    payload.check_in_date =
                        params.check_in_date;

                    payload.check_out_date =
                        params.check_out_date;
                }

                // SHORT STAY
                else {

                    payload.hours =
                        Number(params.hours);
                }

                await api.post(
                    "/bookings",
                    payload
                );
            }

            alert(
                "Booking Successful ✅"
            );

            router.replace(
                "/(guest)/(tabs)/home"
            );

        } catch (err: any) {

            console.log(
                err.response?.data
            );

            alert(
                err.response?.data?.message ||
                "Payment failed"
            );

        } finally {

            setLoading(false);
        }
    };

    return (
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
                }}
            >

                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 rounded-full bg-white/10 justify-center items-center mb-6"
                >
                    <Ionicons
                        name="chevron-back"
                        size={20}
                        color="#fff"
                    />
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
                contentContainerStyle={{
                    paddingBottom:
                        140 + insets.bottom,
                }}
                showsVerticalScrollIndicator={false}
            >

                <View className="px-6 pt-8">

                    {/* GCASH */}
                    <TouchableOpacity
                        onPress={() =>
                            setPaymentMethod("gcash")
                        }
                        activeOpacity={0.85}
                        className={`rounded-2xl border p-5 mb-4 flex-row items-center justify-between ${paymentMethod === "gcash"
                            ? "bg-[#1a4a35] border-[#1a4a35]"
                            : "bg-white border-[#1a4a35]/10"
                            }`}
                    >

                        <View className="flex-row items-center gap-3">

                            <View
                                className={`w-12 h-12 rounded-full justify-center items-center ${paymentMethod === "gcash"
                                    ? "bg-white/10"
                                    : "bg-[#1a4a35]/05"
                                    }`}
                            >
                                <Ionicons
                                    name="phone-portrait-outline"
                                    size={22}
                                    color={
                                        paymentMethod === "gcash"
                                            ? "#fff"
                                            : "#1a4a35"
                                    }
                                />
                            </View>

                            <View>
                                <Text
                                    className={`${paymentMethod === "gcash"
                                        ? "text-white"
                                        : "text-[#1a4a35]"
                                        } text-lg`}
                                    style={{
                                        fontFamily:
                                            "Georgia",
                                    }}
                                >
                                    GCash
                                </Text>

                                <Text
                                    className={`${paymentMethod === "gcash"
                                        ? "text-white/60"
                                        : "text-[#1a4a35]/40"
                                        } text-xs`}
                                >
                                    Mobile Payment
                                </Text>
                            </View>

                        </View>

                        {paymentMethod === "gcash" && (
                            <Ionicons
                                name="checkmark-circle"
                                size={24}
                                color="#c9a96e"
                            />
                        )}

                    </TouchableOpacity>

                    {/* BANK */}
                    <TouchableOpacity
                        onPress={() =>
                            setPaymentMethod("bank")
                        }
                        activeOpacity={0.85}
                        className={`rounded-2xl border p-5 flex-row items-center justify-between ${paymentMethod === "bank"
                            ? "bg-[#1a4a35] border-[#1a4a35]"
                            : "bg-white border-[#1a4a35]/10"
                            }`}
                    >

                        <View className="flex-row items-center gap-3">

                            <View
                                className={`w-12 h-12 rounded-full justify-center items-center ${paymentMethod === "bank"
                                    ? "bg-white/10"
                                    : "bg-[#1a4a35]/05"
                                    }`}
                            >
                                <Ionicons
                                    name="card-outline"
                                    size={22}
                                    color={
                                        paymentMethod === "bank"
                                            ? "#fff"
                                            : "#1a4a35"
                                    }
                                />
                            </View>

                            <View>
                                <Text
                                    className={`${paymentMethod === "bank"
                                        ? "text-white"
                                        : "text-[#1a4a35]"
                                        } text-lg`}
                                    style={{
                                        fontFamily:
                                            "Georgia",
                                    }}
                                >
                                    Bank Transfer
                                </Text>

                                <Text
                                    className={`${paymentMethod === "bank"
                                        ? "text-white/60"
                                        : "text-[#1a4a35]/40"
                                        } text-xs`}
                                >
                                    Online Banking
                                </Text>
                            </View>

                        </View>

                        {paymentMethod === "bank" && (
                            <Ionicons
                                name="checkmark-circle"
                                size={24}
                                color="#c9a96e"
                            />
                        )}

                    </TouchableOpacity>

                    {/* REFERENCES */}
                    <View className="mt-6">

                        {paymentMethod === "gcash" && (
                            <>
                                <Text className="text-[#1a4a35]/60 mb-2">
                                    GCash Reference
                                </Text>

                                <TextInput
                                    value={gcashReference}
                                    onChangeText={
                                        setGcashReference
                                    }
                                    placeholder="Enter GCash reference"
                                    className="bg-white border border-[#1a4a35]/10 rounded-2xl px-4 py-4"
                                />
                            </>
                        )}

                        {paymentMethod === "bank" && (
                            <>
                                <Text className="text-[#1a4a35]/60 mb-2">
                                    Bank Reference
                                </Text>

                                <TextInput
                                    value={bankReference}
                                    onChangeText={
                                        setBankReference
                                    }
                                    placeholder="Enter bank transfer reference"
                                    className="bg-white border border-[#1a4a35]/10 rounded-2xl px-4 py-4"
                                />
                            </>
                        )}

                    </View>

                </View>

            </ScrollView>

            {/* PAY BUTTON */}
            <View
                className="absolute bottom-0 left-0 right-0 px-6 bg-[#faf8f3] border-t border-[#1a4a35]/08"
                style={{
                    paddingBottom:
                        insets.bottom + 16,
                    paddingTop: 16,
                }}
            >

                <TouchableOpacity
                    onPress={handlePayment}
                    disabled={loading}
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
                            style={{
                                fontFamily:
                                    "Georgia",
                            }}
                        >
                            {loading
                                ? "Processing..."
                                : "Pay Now"}
                        </Text>

                        {!loading && (
                            <Ionicons
                                name="arrow-forward"
                                size={16}
                                color="#c9a96e"
                            />
                        )}

                    </LinearGradient>

                </TouchableOpacity>

            </View>

        </View>
    );
}