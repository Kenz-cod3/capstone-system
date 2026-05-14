import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

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

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [text, setText] = useState("");

  const [inputHeight, setInputHeight] =
    useState(45);

  const flatListRef =
    useRef<FlatList>(null);

  const inputRef =
    useRef<TextInput>(null);

  // 🔥 FETCH
  const fetchMessages = async () => {

    try {

      const res = await api.get(
        `/messages/conversation/${user.id}/${otherUserId}`
      );

      const data = Array.isArray(res.data)
        ? res.data
        : [];

      setMessages((prev) =>
        data.map((msg: any) => {

          const existing = prev.find(
            (p) => p.id === msg.id
          );

          return {
            ...msg,
            status:
              existing?.status || "sent",
          };
        })
      );

    } catch (error) {

      console.log(
        "❌ FETCH ERROR:",
        error
      );
    }
  };

  // 🔥 SEND
  const sendMessage = async () => {

    if (!text.trim()) return;

    const tempId = Date.now();

    const messageToSend = text;

    // 🔥 INSTANT UI
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

      await api.post("/messages", {

        sender_id: user.id,

        content: messageToSend,

        targets: [
          {
            target_id: otherUserId,
            target_type:
              "App\\Models\\User",
          },
        ],
      });

      // ✅ SENT
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
              ...m,
              status: "sent",
            }
            : m
        )
      );

    } catch (err) {

      console.log(err);

      // ❌ FAILED
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
              ...m,
              status: "failed",
            }
            : m
        )
      );
    }
  };

  // 🔥 INITIAL LOAD ONLY
  useFocusEffect(
    useCallback(() => {

      const load = async () => {

        await fetchMessages();

        await api.put(
          `/messages/read/${user.id}/${otherUserId}`
        );
      };

      load();

    }, [otherUserId])
  );

  // 🔥 REALTIME
  useEffect(() => {

    if (!user?.id) return;

    console.log(
      "📱 MOBILE REALTIME READY"
    );

    const disconnect =
      connectRealtime(

        user.id,

        () => { },

        () => { },

        (payload) => {

          console.log(
            "🔥 MOBILE CHAT REALTIME:",
            payload
          );

          const raw =
            payload.message ||
            payload;

          const incoming = {

            id: raw?.id,

            is_read: false,

            status: "sent" as const,

            message: {
              message: raw?.message,
              sender_id: raw?.sender_id,
            }
          };

          setMessages((prev) => {

            if (!incoming?.id) {
              return prev;
            }

            const exists = prev.some(
              (m) => m.id === incoming.id
            );

            if (exists) return prev;

            return [
              ...prev,
              incoming
            ];
          });
        },

        () => { }
      );

    return () => {
      disconnect?.();
    };

  }, []);

  // 🔥 AUTO SCROLL
  useEffect(() => {

    setTimeout(() => {

      flatListRef.current
        ?.scrollToEnd({
          animated: true,
        });

    }, 100);

  }, [messages]);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback
      onPress={dismissKeyboard}
    >

      <View className="flex-1 bg-white">

        {/* 🔥 GRADIENT */}
        <LinearGradient
          colors={[
            "#d1fae5",
            "#a7f3d0",
            "#ffffff",
          ]}
          locations={[0, 0.3, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            position: "absolute",

            top: 0,
            left: 0,
            right: 0,

            height:
              insets.top + 120,
          }}
        />

        {/* 🔥 HEADER */}
        <View
          style={{
            paddingTop:
              insets.top + 10,

            paddingBottom: 10,

            paddingHorizontal: 16,

            backgroundColor:
              "transparent",
          }}
        >

          <View className="flex-row items-center">

            <TouchableOpacity
              onPress={() => {

                if (
                  router.canGoBack()
                ) {
                  router.back();
                }
              }}
            >

              <Ionicons
                name="chevron-back"
                size={28}
                color="#065f46"
              />

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

        {/* 🔥 CHAT LIST */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) =>
            item.id.toString()
          }
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 90,
          }}
          showsVerticalScrollIndicator={
            false
          }
          onLayout={() => {

            flatListRef.current
              ?.scrollToEnd({
                animated: false,
              });
          }}
          renderItem={({
            item,
            index,
          }) => {

            const isMe =
              item.message.sender_id ===
              user.id;

            const isLast =
              index ===
              messages.length - 1;

            return (
              <View
                className={`mb-3 ${isMe
                  ? "items-end"
                  : "items-start"
                  }`}
              >

                {/* 🔥 MESSAGE */}
                <View
                  className={`px-4 py-3 rounded-3xl max-w-[80%] ${isMe
                    ? "bg-emerald-500 rounded-br-none"
                    : "bg-white border border-gray-200 rounded-bl-none"
                    }`}
                  style={{
                    shadowColor: "#000",

                    shadowOffset: {
                      width: 0,
                      height: 1,
                    },

                    shadowOpacity: 0.05,

                    shadowRadius: 2,

                    elevation: 1,
                  }}
                >

                  <Text
                    className={
                      isMe
                        ? "text-white"
                        : "text-gray-800"
                    }
                  >
                    {item.message.message}
                  </Text>

                </View>

                {/* 🔥 STATUS */}
                {isMe && isLast && (

                  <View className="flex-row items-center mt-1 mr-1">

                    <Text className="text-[11px] text-gray-400">

                      {item.status ===
                        "sending" &&
                        "Sending..."}

                      {item.status ===
                        "failed" &&
                        "Failed ❌"}

                      {item.status ===
                        "sent" &&
                        (
                          item.is_read
                            ? "Seen"
                            : "Sent"
                        )}

                    </Text>

                  </View>
                )}

              </View>
            );
          }}
        />

        {/* 🔥 INPUT */}
        <View
          className="px-3 py-3 bg-white border-t border-gray-200"
          style={{
            paddingBottom:
              insets.bottom + 5,
          }}
        >

          <View className="flex-row items-end">

            {/* 🔥 AUTO HEIGHT INPUT */}
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor="#9ca3af"
              multiline
              maxLength={500}

              onContentSizeChange={(e) => {

                const height =
                  e.nativeEvent
                    .contentSize.height;

                if (height < 140) {

                  setInputHeight(
                    Math.max(
                      45,
                      height
                    )
                  );
                }
              }}

              style={{
                height: inputHeight,
                maxHeight: 140,
                textAlignVertical: "top",
              }}

              className="flex-1 bg-gray-100 rounded-3xl px-4 py-3 mr-2 text-base"
            />

            {/* 🔥 SEND */}
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!text.trim()}
              className={`px-5 rounded-full justify-center items-center ${text.trim()
                ? "bg-emerald-500"
                : "bg-gray-300"
                }`}
              style={{
                height: 45,
              }}
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