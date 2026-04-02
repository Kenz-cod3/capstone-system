import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useEffect, useState } from "react";
import api from "@/services/api";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function Messages() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchData = async () => {
    try {
      const [convoRes, usersRes] = await Promise.all([
        api.get("/messages/conversations"),
        api.get("/chat/users"),
      ]);

      const conversations = convoRes.data;
      const users = usersRes.data;

      const merged = users.map((user: any) => {
        const existing = conversations.find(
          (c: any) => c.user.id === user.id
        );

        return existing || {
          user,
          last_message: "Start a conversation",
          unread: 0,
        };
      });

      setList(merged);
    } catch (e) {
      console.log("❌ ERROR:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">

      {/* 🔥 HEADER */}
      <View className="px-4 pt-6 pb-3 bg-white border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-800">
          Messages
        </Text>
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.user.id.toString()}
        contentContainerStyle={{ padding: 10, paddingBottom: 120 }}
        renderItem={({ item }) => {
          return (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/chat/[userId]",
                  params: {
                    userId: item.user.id,
                    name: `${item.user.first_name} ${item.user.last_name}`,
                  },
                })
              }
              className="flex-row items-center bg-white p-3 rounded-2xl mb-3 shadow-sm"
            >
              {/* 🔥 AVATAR */}
              <View className="w-12 h-12 rounded-full bg-green-500 items-center justify-center mr-3">
                <Text className="text-white font-bold">
                  {item.user.first_name?.charAt(0)}
                </Text>
              </View>

              {/* 🔥 TEXT */}
              <View className="flex-1">
                <Text className="font-semibold text-gray-800">
                  {item.user.first_name} {item.user.last_name}
                </Text>

                <Text
                  numberOfLines={1}
                  className="text-gray-500 text-sm mt-1"
                >
                  {item.last_message}
                </Text>
              </View>

              {/* 🔥 RIGHT SIDE */}
              <View className="items-end">
                {item.unread > 0 && (
                  <View className="bg-green-500 px-2 py-1 rounded-full">
                    <Text className="text-white text-xs">
                      {item.unread}
                    </Text>
                  </View>
                )}

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#9ca3af"
                  style={{ marginTop: 5 }}
                />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}