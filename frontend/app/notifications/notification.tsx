import { View, Text, FlatList } from "react-native";
import { useEffect, useState } from "react";
import api from "../../services/api";

type NotificationType = {
    id: number;
    title: string;
    message: string;
};

export default function Notification() {
    const [data, setData] = useState<NotificationType[]>([]);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get("/notifications/user/1");

            // ✅ FIX HERE (no backticks)
            const result = res.data?.data || res.data;

            setData(Array.isArray(result) ? result : []);   
        } catch (error) {
            console.log("NOTIFICATION ERROR:", error);
            setData([]);
        }
    };

    return (
        <FlatList
            data={data}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 10 }}
            renderItem={({ item }) => (
                <View className="p-4 border-b">
                    <Text className="font-bold">{item.title}</Text>
                    <Text>{item.message}</Text>
                </View>
            )}
        />
    );
}