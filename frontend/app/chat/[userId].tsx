import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useEffect, useRef, useState, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();

  const otherUserId = params.userId as string;
  const name = params.name as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // FETCH
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

  // SEND
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

  // FOCUS (seen fix + auto refresh)
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        await fetchMessages();
        await api.put(`/messages/read/${user.id}/${otherUserId}`);
      };

      load();
      const interval = setInterval(load, 3000);

      return () => clearInterval(interval);
    }, [otherUserId])
  );

  // AUTO SCROLL ON NEW MESSAGES
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View className="flex-1 bg-white">
        {/* Gradient Background - Same as Notification */}
        <LinearGradient
          colors={["#d1fae5", "#a7f3d0", "#ffffff"]}
          locations={[0, 0.3, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: insets.top + 120,
          }}
        />

        {/* HEADER */}
        <View
          style={{
            paddingTop: insets.top + 10,
            paddingBottom: 10,
            paddingHorizontal: 16,
            backgroundColor: "transparent",
          }}
        >
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                }}
              }
            >
              <Ionicons name="chevron-back" size={28} color="#065f46" />
            </TouchableOpacity>

            <View className="ml-3">
              <Text className="text-lg font-bold text-emerald-800">
                {name || "Agent"}
              </Text>
              <Text className="text-xs text-green-600">
                Online
              </Text>
            </View>
          </View>
        </View>

        {/* CHAT LIST */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 80,
          }}
          showsVerticalScrollIndicator={false}
          onLayout={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
          renderItem={({ item, index }) => {
            const isMe = item.message.sender_id === user.id;
            const isLast = index === messages.length - 1;

            return (
              <View
                className={`mb-3 ${
                  isMe ? "items-end" : "items-start"
                }`}
              >
                {/* MESSAGE BUBBLE */}
                <View
                  className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                    isMe
                      ? "bg-emerald-500 rounded-br-none"
                      : "bg-white border border-gray-200 rounded-bl-none"
                  }`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <Text className={isMe ? "text-white" : "text-gray-800"}>
                    {item.message.message}
                  </Text>
                </View>

                {/* STATUS */}
                {isMe && isLast && (
                  <View className="flex-row items-center mt-1 mr-1">
                    <Text className="text-[11px] text-gray-400">
                      {item.status === "sending" && "Sending..."}
                      {item.status === "failed" && "Failed ❌"}
                      {item.status === "sent" &&
                        (item.is_read ? "Seen" : "Sent")}
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
        />

        {/* INPUT - NO KEYBOARD AVOIDING */}
        <View className="px-3 py-3 bg-white border-t border-gray-200">
          <View className="flex-row items-center">
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor="#9ca3af"
              className="flex-1 bg-gray-100 rounded-full px-4 py-3 mr-2 text-base"
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              onPress={sendMessage}
              disabled={!text.trim()}
              className={`px-5 py-3 rounded-full ${
                text.trim() ? "bg-emerald-500" : "bg-gray-300"
              }`}
            >
              <Text className="text-white font-semibold">
                Send
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}