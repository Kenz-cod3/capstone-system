import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
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
import { connectRealtime } from "@/services/realtime";

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

  const [inputHeight, setInputHeight] = useState(45);

  const flatListRef = useRef<FlatList>(null);

  const inputRef = useRef<TextInput>(null);

  // FETCH
  const fetchMessages = async () => {
    try {
      const res = await api.get(
        `/messages/conversation/${user.id}/${otherUserId}`,
      );

      const data = Array.isArray(res.data) ? res.data : [];

      setMessages((prev) =>
        data.map((msg: any) => {
          const existing = prev.find((p) => p.id === msg.id);

          return {
            ...msg,
            status: existing?.status || "sent",
          };
        }),
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

    // INSTANT UI
    setMessages((prev) => [
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

    setInputHeight(45);

    try {
      const res = await api.post("/messages", {
        sender_id: user.id,
        content: messageToSend,
        targets: [
          {
            target_id: Number(otherUserId),
          },
        ],
      });

      const messageData = res.data.data;
      const realTarget = messageData.targets[0];

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...m,
                id: realTarget.id,
                is_read: realTarget.is_read,
                message: {
                  message: messageData.message,
                  sender_id: messageData.sender_id,
                },
                status: "sent",
              }
            : m,
        ),
      );
    } catch (err) {
      console.log(err);

      // FAILED
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...m,
                status: "failed",
              }
            : m,
        ),
      );
    }
  };

  // INITIAL LOAD ONLY
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        await fetchMessages();

        await api.put(`/messages/read/${user.id}/${otherUserId}`);
      };

      load();
    }, [otherUserId]),
  );

  // REALTIME
  useEffect(() => {
    if (!user?.id) return;

    console.log("📱 MOBILE REALTIME READY");

    const disconnect = connectRealtime(
      user.id,

      () => {},

      () => {},

      (payload) => {
        console.log("🔥 MOBILE CHAT REALTIME:", payload);

        const raw = payload.message;

        const incoming = {
          id: raw.id,
          is_read: raw.is_read,
          status: "sent" as const,
          message: raw.message,
        };

        setMessages((prev) => {
          if (!incoming?.id) {
            return prev;
          }

          const exists = prev.some((m) => m.id === incoming.id);

          if (exists) return prev;

          return [...prev, incoming];
        });
      },

      () => {},
    );

    return () => {
      disconnect?.();
    };
  }, []);

  // AUTO SCROLL
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({
        animated: true,
      });
    }, 100);
  }, [messages]);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View className="flex-1 bg-[#faf8f3]">
        {/* HEADER */}
        <View>
          <LinearGradient
            colors={["#0d2e1f", "#1a4a35", "#0d2e1f"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingTop: insets.top + 12,
              paddingBottom: 18,
              paddingHorizontal: 20,
              borderBottomLeftRadius: 28,
              borderBottomRightRadius: 28,
              overflow: "hidden",
            }}
          >
            {/* Decorative circle */}
            <View
              className="absolute rounded-full border border-white/5"
              style={{ width: 160, height: 160, top: -60, right: -40 }}
            />

            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  }
                }}
                className="w-9 h-9 rounded-full bg-white/10 border border-white/10 justify-center items-center"
              >
                <Ionicons name="chevron-back" size={20} color="#c9a96e" />
              </TouchableOpacity>

              {/* Monogram avatar */}
              <View className="w-10 h-10 rounded-full bg-[#c9a96e]/20 border border-[#c9a96e]/40 justify-center items-center ml-3">
                <Text
                  className="text-[#c9a96e] text-sm font-bold"
                  style={{ fontFamily: "Georgia" }}
                >
                  {(name || "A").charAt(0).toUpperCase()}
                </Text>
              </View>

              <View className="ml-3">
                <Text
                  className="text-white text-lg"
                  style={{ fontFamily: "Georgia" }}
                >
                  {name || "Agent"}
                </Text>

                <View className="flex-row items-center gap-1.5 mt-0.5">
                  <View className="w-1.5 h-1.5 rounded-full bg-[#c9a96e]" />
                  <Text className="text-white/50 text-[11px] tracking-widest uppercase">
                    Online
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* CHAT LIST */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 90,
          }}
          showsVerticalScrollIndicator={false}
          onLayout={() => {
            flatListRef.current?.scrollToEnd({
              animated: false,
            });
          }}
          renderItem={({ item, index }) => {
            const isMe = item.message.sender_id === user.id;

            const isLast = index === messages.length - 1;

            return (
              <View className={`mb-3 ${isMe ? "items-end" : "items-start"}`}>
                {/* MESSAGE BUBBLE */}
                {isMe ? (
                  <LinearGradient
                    colors={["#1a4a35", "#0d2e1f"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      borderRadius: 22,
                      borderBottomRightRadius: 4,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      maxWidth: "80%",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <Text className="text-white text-[15px]">
                      {item.message.message}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View
                    className="px-4 py-3 rounded-[22px] max-w-[80%] bg-white border border-[#1a4a35]/10"
                    style={{
                      borderBottomLeftRadius: 4,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.04,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                  >
                    <Text className="text-[#1a4a35] text-[15px]">
                      {item.message.message}
                    </Text>
                  </View>
                )}

                {/* STATUS */}
                {isMe && isLast && (
                  <View className="flex-row items-center mt-1.5 mr-1 gap-1">
                    {item.status === "sent" && item.is_read && (
                      <View className="w-1 h-1 rounded-full bg-[#c9a96e]" />
                    )}
                    <Text
                      className={`text-[11px] tracking-wide ${
                        item.status === "failed"
                          ? "text-red-500"
                          : "text-[#1a4a35]/40"
                      }`}
                    >
                      {item.status === "sending" && "Sending..."}

                      {item.status === "failed" && "Failed to send"}

                      {item.status === "sent" &&
                        (item.is_read ? "Seen" : "Sent")}
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
        />

        {/* INPUT */}
        <View
          className="px-4 py-3 bg-white border-t border-[#1a4a35]/10"
          style={{
            paddingBottom: insets.bottom + 5,
          }}
        >
          <View className="flex-row items-end">
            {/* AUTO HEIGHT INPUT */}
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor="rgba(26,74,53,0.35)"
              multiline
              maxLength={500}
              onContentSizeChange={(e) => {
                const height = e.nativeEvent.contentSize.height;

                if (height < 140) {
                  setInputHeight(Math.max(45, height));
                }
              }}
              style={{
                height: inputHeight,
                maxHeight: 140,
                textAlignVertical: "top",
              }}
              className="flex-1 bg-[#faf8f3] rounded-3xl px-4 py-3 mr-2 text-[15px] text-[#1a4a35] border border-[#1a4a35]/10"
            />

            {/* SEND */}
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!text.trim()}
              activeOpacity={0.85}
              style={{
                height: 45,
                width: 45,
                borderRadius: 22.5,
                overflow: "hidden",
              }}
            >
              {text.trim() ? (
                <LinearGradient
                  colors={["#1a4a35", "#0d2e1f"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="arrow-up" size={20} color="#c9a96e" />
                </LinearGradient>
              ) : (
                <View className="flex-1 justify-center items-center bg-[#1a4a35]/10">
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color="rgba(26,74,53,0.3)"
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}