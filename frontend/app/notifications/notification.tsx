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
        api.get("/notifications/user/1").then((res) => {
            const result = res.data.data || res.data;
            setData(result);
        });
    }, []);

    return (
        <FlatList
            data={data}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
                <View className="p-4 border-b">
                    <Text className="font-bold">{item.title}</Text>
                    <Text>{item.message}</Text>
                </View>
            )}
        />
    );
}