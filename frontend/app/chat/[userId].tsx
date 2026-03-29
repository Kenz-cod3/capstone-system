import { View, Text } from "react-native";
import { useEffect, useState } from "react";
import api from "../../services/api";

type Message = {
    id: number;
    message: string;
};

export default function Chat() {
    const [messages, setMessages] = useState<Message[]>([]);

    const fetchMessages = async () => {
        const res = await api.get("/messages");

        const result = res.data.data || res.data;

        setMessages(Array.isArray(result) ? result : []);
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    return (
        <View className="flex-1 p-4">
            {messages.map((msg) => (
                <Text key={msg.id}>{msg.message}</Text>
            ))}
        </View>
    );
}