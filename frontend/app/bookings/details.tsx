import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    Image,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

export default function BookingDetails() {
    const { room } = useLocalSearchParams();
    const router = useRouter();

    const [loading, setLoading] = useState(false);

    const parsedRoom = room ? JSON.parse(room as string) : null;

    if (!parsedRoom) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center bg-white">
                <Text>No room data</Text>
            </SafeAreaView>
        );
    }

    const handleBook = () => {
        if (loading) return;

        setLoading(true);

        router.push({
            pathname: "/bookings/create",
            params: {
                room: JSON.stringify(parsedRoom),
            },
        });

        // no delay feel, just small reset
        setTimeout(() => setLoading(false), 500);
    };

    return (
        <View className="flex-1 bg-white">

            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

            <ScrollView className="flex-1">

                {/* 🖼 HERO */}
                <View className="relative">
                    <Image
                        source={{
                            uri: parsedRoom.image_url || "https://picsum.photos/400",
                        }}
                        className="w-full h-[520px]"
                    />

                    <View className="absolute inset-0 bg-black/40" />

                    {/* 🔙 BACK */}
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="absolute top-16 left-4"
                    >
                        <Ionicons name="chevron-back" size={38} color="#fff" />
                    </TouchableOpacity>

                    {/* TITLE */}
                    <View className="absolute bottom-12 left-4 right-4 flex-row justify-between items-end">
                        <View>
                            <Text className="text-white text-2xl font-bold">
                                Room {parsedRoom.room_number}
                            </Text>
                            <Text className="text-white opacity-90 mt-1">
                                {parsedRoom.room_type?.type_name}
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => console.log("View image")}
                            className="bg-black/50 p-3 rounded-full"
                        >
                            <Ionicons name="eye" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 📦 CONTENT */}
                <View className="p-4 pb-32 bg-white rounded-t-3xl -mt-6">

                    <Text className="text-4xl font-bold text-blue-600 mb-2">
                        ₱{parsedRoom.room_type?.base_price}
                    </Text>

                    <View
                        className={`self-start px-4 py-1 rounded-full ${parsedRoom.status === "available"
                                ? "bg-green-100"
                                : parsedRoom.status === "occupied"
                                    ? "bg-blue-100"
                                    : "bg-red-100"
                            }`}
                    >
                        <Text
                            className={`font-semibold capitalize ${parsedRoom.status === "available"
                                    ? "text-green-600"
                                    : parsedRoom.status === "occupied"
                                        ? "text-blue-600"
                                        : "text-red-600"
                                }`}
                        >
                            {parsedRoom.status}
                        </Text>
                    </View>

                    <Text className="text-gray-600 mt-4 leading-5">
                        This room is clean, comfortable, and perfect for your stay.
                    </Text>

                </View>
            </ScrollView>

            {/* 🔥 BOOK BUTTON */}
            <View className="absolute bottom-10 left-0 right-0 bg-white p-4">
                <TouchableOpacity
                    onPress={handleBook}
                    disabled={loading}
                    className={`py-4 rounded-xl ${loading ? "bg-gray-400" : "bg-blue-600"
                        }`}
                >
                    <Text className="text-white text-center font-semibold text-lg">
                        {loading ? "Opening..." : "Book Now"}
                    </Text>
                </TouchableOpacity>
            </View>

        </View>
    );
}