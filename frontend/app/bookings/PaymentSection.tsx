import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

interface Props {
    paymentMethod: string;
    setPaymentMethod: (value: string) => void;

    gcashReference: string;
    setGcashReference: (value: string) => void;

    bankReference: string;
    setBankReference: (value: string) => void;
}

export default function PaymentSection({
    paymentMethod,
    setPaymentMethod,
    gcashReference,
    setGcashReference,
    bankReference,
    setBankReference,
}: Props) {

    const methods = [
        {
            key: "gcash",
            label: "GCash",
            icon: "phone-portrait-outline",
        },
        {
            key: "bank",
            label: "Bank",
            icon: "card-outline",
        },
        // OPTIONAL CASH
        // {
        //     key: "cash",
        //     label: "Cash",
        //     icon: "cash-outline",
        // },
    ];

    return (
        <View className="mx-6 mt-6">

            {/* CARD */}
            <View className="bg-white rounded-3xl p-5 border border-[#1a4a35]/10 shadow-sm">

                {/* HEADER */}
                <View className="mb-5">
                    <Text
                        className="text-[#1a4a35]/40 text-[10px] tracking-[3px] uppercase mb-1"
                    >
                        Payment
                    </Text>

                    <Text
                        className="text-[#1a4a35] text-xl"
                        style={{ fontFamily: "Georgia" }}
                    >
                        Select payment method
                    </Text>
                </View>

                {/* METHODS */}
                <View className="gap-3">

                    {methods.map((method) => {

                        const selected =
                            paymentMethod === method.key;

                        return (
                            <TouchableOpacity
                                key={method.key}
                                activeOpacity={0.85}
                                onPress={() =>
                                    setPaymentMethod(method.key)
                                }
                                className={`rounded-2xl border px-4 py-4 flex-row items-center justify-between ${
                                    selected
                                        ? "bg-[#1a4a35] border-[#1a4a35]"
                                        : "bg-[#faf8f3] border-[#1a4a35]/10"
                                }`}
                            >

                                <View className="flex-row items-center gap-3">

                                    <View
                                        className={`w-11 h-11 rounded-full items-center justify-center ${
                                            selected
                                                ? "bg-white/10"
                                                : "bg-[#1a4a35]/5"
                                        }`}
                                    >
                                        <Ionicons
                                            name={method.icon as any}
                                            size={20}
                                            color={
                                                selected
                                                    ? "#fff"
                                                    : "#1a4a35"
                                            }
                                        />
                                    </View>

                                    <Text
                                        className={`text-base ${
                                            selected
                                                ? "text-white"
                                                : "text-[#1a4a35]"
                                        }`}
                                        style={{ fontFamily: "Georgia" }}
                                    >
                                        {method.label}
                                    </Text>

                                </View>

                                {selected && (
                                    <Ionicons
                                        name="checkmark-circle"
                                        size={24}
                                        color="#c9a96e"
                                    />
                                )}

                            </TouchableOpacity>
                        );
                    })}

                </View>

                {/* GCASH */}
                {paymentMethod === "gcash" && (
                    <View className="mt-5">

                        <Text className="text-[#1a4a35]/60 mb-2">
                            GCash Reference Number
                        </Text>

                        <TextInput
                            value={gcashReference}
                            onChangeText={setGcashReference}
                            placeholder="Enter GCash reference"
                            placeholderTextColor="#999"
                            className="bg-[#faf8f3] border border-[#1a4a35]/10 rounded-2xl px-4 py-4 text-[#1a4a35]"
                        />

                    </View>
                )}

                {/* BANK */}
                {paymentMethod === "bank" && (
                    <View className="mt-5">

                        <Text className="text-[#1a4a35]/60 mb-2">
                            Bank Transfer Reference
                        </Text>

                        <TextInput
                            value={bankReference}
                            onChangeText={setBankReference}
                            placeholder="Enter bank reference"
                            placeholderTextColor="#999"
                            className="bg-[#faf8f3] border border-[#1a4a35]/10 rounded-2xl px-4 py-4 text-[#1a4a35]"
                        />

                    </View>
                )}

            </View>

        </View>
    );
}