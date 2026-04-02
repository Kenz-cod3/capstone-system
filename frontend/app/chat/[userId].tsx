import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useEffect, useRef, useState, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "@/services/api";
import { useAuthStore } from "@/store/authStore";

type Message = {
  id: number;
  is_read: boolean;
  status?: "sending" | "sent" | "failed";
  message: {
    message: string;
    sender_id: number;
  };
};

export default function Chat() {
  const { user } = useAuthStore();
  const router = useRouter();
  const params = useLocalSearchParams();

  const otherUserId = params.userId as string;
  const name = params.name as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");

  const flatListRef = useRef<FlatList>(null);

  // 🔥 FETCH
  const fetchMessages = async () => {
    try {
      const res = await api.get(
        `/messages/conversation/${user.id}/${otherUserId}`
      );

      const data = Array.isArray(res.data) ? res.data : [];

      setMessages(prev =>
        data.map((msg: any) => {
          const existing = prev.find(p => p.id === msg.id);
          return {
            ...msg,
            status: existing?.status || "sent",
          };
        })
      );
    } catch (error) {
      console.log("❌ FETCH ERROR:", error);
    }
  };

  // 🔥 SEND
  const sendMessage = async () => {
    if (!text.trim()) return;

    const tempId = Date.now();
    const messageToSend = text;

    setMessages(prev => [
      ...prev,
      {
        id: tempId,
        message: {
          message: messageToSend,
          sender_id: user.id,
        },
        is_read: false,
        status: "sending",
      },
    ]);

    setText("");

    try {
      await api.post("/messages", {
        sender_id: user.id,
        content: messageToSend,
        targets: [
          {
            target_id: otherUserId,
            target_type: "App\\Models\\User",
          },
        ],
      });

      setMessages(prev =>
        prev.map(m =>
          m.id === tempId ? { ...m, status: "sent" } : m
        )
      );

      fetchMessages();
    } catch (err) {
      console.log(err);

      setMessages(prev =>
        prev.map(m =>
          m.id === tempId ? { ...m, status: "failed" } : m
        )
      );
    }
  };

  // 🔥 FOCUS (seen fix + auto refresh)
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        await fetchMessages();
        await api.put(`/messages/read/${user.id}/${otherUserId}`);
      };

      load();
      const interval = setInterval(load, 2000);

      return () => clearInterval(interval);
    }, [otherUserId])
  );

  // 🔥 AUTO SCROLL
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={80} // 🔥 FIX SPACE
      className="flex-1 bg-gray-50"
    >

      {/* 🔥 HEADER */}
      <View className="flex-row items-center p-4 bg-white border-b border-gray-200">
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/messages");
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <View className="ml-3">
          <Text className="text-lg font-bold">
            {name || "Chat"}
          </Text>
          <Text className="text-xs text-green-500">
            Online
          </Text>
        </View>
      </View>

      {/* 🔥 CHAT LIST */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{
          padding: 10,
          paddingBottom: 140, // 🔥 EXTRA SPACE (IMPORTANT)
        }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const isMe = item.message.sender_id === user.id;
          const isLast = index === messages.length - 1;

          return (
            <View
              className={`mb-2 ${
                isMe ? "items-end" : "items-start"
              }`}
            >
              {/* MESSAGE */}
              <View
                className={`px-4 py-2 rounded-2xl max-w-[75%] ${
                  isMe
                    ? "bg-green-500 rounded-br-none"
                    : "bg-white border border-gray-200 rounded-bl-none"
                }`}
              >
                <Text className={isMe ? "text-white" : "text-gray-800"}>
                  {item.message.message}
                </Text>
              </View>

              {/* STATUS */}
              {isMe && isLast && (
                <Text className="text-[11px] text-gray-400 mt-1 mr-1">
                  {item.status === "sending" && "Sending..."}
                  {item.status === "failed" && "Failed ❌"}
                  {item.status === "sent" &&
                    (item.is_read ? "Seen" : "Sent")}
                </Text>
              )}
            </View>
          );
        }}
      />

      {/* 🔥 INPUT */}
      <View className="flex-row items-center px-3 py-3 bg-white border-t border-gray-200 mb-2">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 mr-2"
        />

        <TouchableOpacity
          onPress={sendMessage}
          className="bg-green-500 px-4 py-2 rounded-full"
        >
          <Text className="text-white font-semibold">
            Send
          </Text>
        </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
  );
}