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
} from "react-native";
import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const AMENITIES = [
    { icon: "wifi-outline", label: "Free WiFi" },
    { icon: "snow-outline", label: "Air Con" },
    { icon: "tv-outline", label: "Smart TV" },
    { icon: "water-outline", label: "Hot Water" },
    { icon: "cafe-outline", label: "Minibar" },
    { icon: "shield-checkmark-outline", label: "Safe Box" },
];

export default function BookingDetails() {
    const { room } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);

    const parsedRoom = room ? JSON.parse(room as string) : null;

    if (!parsedRoom) {
        return (
            <View className="flex-1 justify-center items-center bg-[#faf8f3]">
                <Text className="text-[#1a4a35]/50" style={{ fontFamily: "Georgia" }}>
                    No room data
                </Text>
            </View>
        );
    }

    const handleBook = () => {
        if (loading) return;
        setLoading(true);
        router.push({
            pathname: "/bookings/create",
            params: { room: JSON.stringify(parsedRoom) },
        });
        setTimeout(() => setLoading(false), 500);
    };

    const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
        available: {
            bg: "rgba(22,163,74,0.12)",   // green-600
            text: "#15803d",               // green-700
            dot: "#16a34a",                // green-600
            label: "Available",
        },
        occupied: {
            bg: "rgba(37,99,235,0.10)",   // blue-600
            text: "#1d4ed8",               // blue-700
            dot: "#2563eb",                // blue-600
            label: "Occupied",
        },
        maintenance: {
            bg: "rgba(220,38,38,0.10)",   // red-600
            text: "#b91c1c",               // red-700
            dot: "#dc2626",                // red-600
            label: "Maintenance",
        },
    };

    const status = statusConfig[parsedRoom.status] ?? statusConfig["occupied"];

    const formatPrice = (price: number) =>
        new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 0,
        }).format(price);

    return (
        <View className="flex-1 bg-[#faf8f3]">
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

                {/* ── HERO IMAGE ── */}
                <View style={{ height: 480 }}>
                    <Image
                        source={{ uri: parsedRoom.image_url || "https://picsum.photos/seed/room/800/600" }}
                        style={{ width: "100%", height: "100%" }}
                        className="bg-[#e8e4d9]"
                    />

                    {/* Layered gradients */}
                    <LinearGradient
                        colors={["rgba(13,46,31,0.55)", "transparent"]}
                        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 160 }}
                    />
                    <LinearGradient
                        colors={["transparent", "rgba(13,46,31,0.92)"]}
                        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 240 }}
                    />

                    {/* Back button */}
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ top: insets.top + 12 }}
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
                        style={{ top: insets.top + 12 }}
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
                                style={{ backgroundColor: status.dot }}
                            />
                            <Text
                                className="text-xs tracking-widest uppercase"
                                style={{ color: status.text }}
                            >
                                {status.label}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── CONTENT CARD ── */}
                <View className="bg-[#faf8f3] rounded-t-[32px] -mt-8 px-6 pt-8 pb-40">

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
                                    {parsedRoom.room_type?.capacity || 2} guests
                                </Text>
                            </View>
                            <View className="flex-row items-center gap-1.5 bg-[#1a4a35]/06 px-3 py-1.5 rounded-full">
                                <Ionicons name="resize-outline" size={13} color="#1a4a35" />
                                <Text className="text-[#1a4a35] text-xs">
                                    {parsedRoom.room_type?.size || 25} m²
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View className="h-px bg-[#1a4a35]/08 mb-6" />

                    {/* Description */}
                    <Text className="text-[#1a4a35]/50 text-xs tracking-[3px] uppercase mb-3">
                        About this room
                    </Text>
                    <Text
                        className="text-[#2c2c2c] text-base leading-7 mb-8"
                        style={{ fontFamily: "Georgia" }}
                    >
                        A thoughtfully appointed retreat offering comfort and elegance.
                        Each detail has been curated to ensure a restful and memorable stay
                        at Lyn Enia's Travelers' Inn.
                    </Text>

                    <View className="h-px bg-[#1a4a35]/08 mb-6" />

                    {/* Amenities */}
                    <Text className="text-[#1a4a35]/50 text-xs tracking-[3px] uppercase mb-4">
                        Amenities
                    </Text>
                    <View className="flex-row flex-wrap gap-3 mb-8">
                        {AMENITIES.map((a) => (
                            <View
                                key={a.label}
                                className="flex-row items-center gap-2 px-3.5 py-2 rounded-full border border-[#1a4a35]/12 bg-white"
                            >
                                <Ionicons name={a.icon as any} size={13} color="#c9a96e" />
                                <Text className="text-[#1a4a35] text-xs">{a.label}</Text>
                            </View>
                        ))}
                    </View>

                    <View className="h-px bg-[#1a4a35]/08 mb-6" />

                    {/* Policies */}
                    <Text className="text-[#1a4a35]/50 text-xs tracking-[3px] uppercase mb-4">
                        Policies
                    </Text>
                    {[
                        { icon: "time-outline", text: "Check-in from 2:00 PM" },
                        { icon: "exit-outline", text: "Check-out by 12:00 PM" },
                        { icon: "ban-outline", text: "No smoking inside the room" },
                        { icon: "paw-outline", text: "Pets not allowed" },
                    ].map((p) => (
                        <View key={p.text} className="flex-row items-center gap-3 mb-3">
                            <View className="w-7 h-7 rounded-full bg-[#1a4a35]/06 justify-center items-center">
                                <Ionicons name={p.icon as any} size={13} color="#1a4a35" />
                            </View>
                            <Text className="text-[#2c2c2c]/70 text-sm">{p.text}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* ── BOOK CTA ── */}
            <View
                className="absolute bottom-0 left-0 right-0 px-6 bg-[#faf8f3] border-t border-[#1a4a35]/08"
                style={{ paddingBottom: insets.bottom + 16, paddingTop: 16 }}
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
                        disabled={loading}
                        activeOpacity={0.85}
                        className="rounded-2xl overflow-hidden flex-1"
                    >
                        <LinearGradient
                            colors={loading ? ["#9ca3af", "#6b7280"] : ["#1a4a35", "#0d2e1f"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            className="flex-row items-center justify-center py-4 gap-2"
                        >
                            <Text
                                className="text-white text-sm tracking-widest uppercase"
                                style={{ fontFamily: "Georgia" }}
                            >
                                {loading ? "Opening..." : "Reserve Now"}
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