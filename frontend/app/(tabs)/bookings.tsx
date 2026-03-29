import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import api from "../../services/api";

type BookingHistory = {
    id: number;
    booking_id: number;
    new_status: string;
    changed_at: string;
};

export default function Bookings() {
    const [data, setData] = useState<BookingHistory[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBookings = async () => {
        try {
            const res = await api.get("/booking-histories");

            // 🔥 FIX
            const result = res.data.data || res.data;

            setData(result);
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    if (loading) return <ActivityIndicator size="large" />;

    return (
        <FlatList
            data={data}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 15 }}
            renderItem={({ item }) => (
                <View className="bg-gray-100 p-4 rounded-xl mb-3">
                    <Text className="font-bold">
                        Booking #{item.booking_id}
                    </Text>
                    <Text>Status: {item.new_status}</Text>
                    <Text>Date: {item.changed_at}</Text>
                </View>
            )}
        />
    );
}