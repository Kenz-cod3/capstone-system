import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useEffect, useState, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import api from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  Swipeable,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { Animated } from "react-native";

type NotificationType = {
  id: number;
  title: string;
  message: string;
  is_read?: boolean;
  created_at?: string;
};

type Section = {
  title: string;
  data: NotificationType[];
};

export default function Notification() {
  const [data, setData] = useState<NotificationType[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [openedSwipeableId, setOpenedSwipeableId] = useState<number | null>(
    null
  );

  const { user, isLoaded } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});

  // FETCH
  useEffect(() => {
    if (isLoaded && user) {
      fetchNotifications();
    }
  }, [isLoaded, user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/notifications/user/${user.id}`);
      const result = res.data?.data || res.data;
      const notifications = Array.isArray(result) ? result : [];
      setData(notifications);
      groupNotificationsByDate(notifications);
    } catch (error) {
      console.log("NOTIFICATION ERROR:", error);
      setData([]);
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  // Group notifications by date
  const groupNotificationsByDate = (notifications: NotificationType[]) => {
    const grouped: { [key: string]: NotificationType[] } = {};
    
    notifications.forEach((item) => {
      if (!item.created_at) return;
      
      const date = new Date(item.created_at);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let sectionTitle = "";
      
      if (date >= today) {
        sectionTitle = "Latest";
      } else if (date >= yesterday) {
        sectionTitle = "Yesterday";
      } else {
        const daysAgo = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (daysAgo < 7) {
          sectionTitle = `${daysAgo} days ago`;
        } else {
          sectionTitle = date.toLocaleDateString();
        }
      }
      
      if (!grouped[sectionTitle]) {
        grouped[sectionTitle] = [];
      }
      grouped[sectionTitle].push(item);
    });
    
    // Convert to sections array with order: Latest, Yesterday, then others
    const sectionOrder = ["Latest", "Yesterday"];
    const orderedSections: Section[] = [];
    
    // Add Latest and Yesterday in order
    sectionOrder.forEach((title) => {
      if (grouped[title]) {
        orderedSections.push({ title, data: grouped[title] });
        delete grouped[title];
      }
    });
    
    // Add remaining sections sorted by date (newest first)
    const remainingSections = Object.keys(grouped).sort((a, b) => {
      // Try to parse as dates
      const dateA = new Date(a);
      const dateB = new Date(b);
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return dateB.getTime() - dateA.getTime();
      }
      return 0;
    });
    
    remainingSections.forEach((title) => {
      orderedSections.push({ title, data: grouped[title] });
    });
    
    setSections(orderedSections);
  };

  // REFRESH
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  // MARK AS READ
  const markAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_read: true } : item
        )
      );
      // Update sections after marking as read
      const updatedData = data.map((item) =>
        item.id === id ? { ...item, is_read: true } : item
      );
      groupNotificationsByDate(updatedData);
    } catch (error) {
      console.log("MARK AS READ ERROR:", error);
    }
  };

  // DELETE
  const deleteNotification = async (id: number) => {
    try {
      setDeletingId(id);

      if (swipeableRefs.current[id]) {
        swipeableRefs.current[id]?.close();
      }

      await api.delete(`/notifications/${id}`);
      const newData = data.filter((item) => item.id !== id);
      setData(newData);
      groupNotificationsByDate(newData);
      setOpenedSwipeableId(null);
    } catch (error) {
      console.log("DELETE ERROR:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // Close all open swipeables instantly
  const closeAllSwipeables = () => {
    Object.keys(swipeableRefs.current).forEach((key) => {
      if (swipeableRefs.current[key]) {
        swipeableRefs.current[key]?.close();
      }
    });
    setOpenedSwipeableId(null);
  };

  // RIGHT ACTION - SAME HEIGHT AS NOTIFICATION
  const renderRightActions = (
    progress: any,
    dragX: any,
    id: number
  ) => {
    const isDeleting = deletingId === id;

    const translateX = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={{
          width: 80,
          height: 85,
          backgroundColor: "#ef4444",
          justifyContent: "center",
          alignItems: "center",
          transform: [{ translateX }],
        }}
      >
        <TouchableOpacity
          onPress={() => deleteNotification(id)}
          disabled={isDeleting}
          activeOpacity={0.8}
          style={{
            flex: 1,
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={24} color="white" />
              <Text style={{ color: "white", fontSize: 12, marginTop: 4 }}>
                Delete
              </Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // INSTANT CLOSE OTHER SWIPEABLES
  const closeOtherSwipeables = (currentId: number) => {
    Object.keys(swipeableRefs.current).forEach((key) => {
      const id = parseInt(key);
      if (id !== currentId && swipeableRefs.current[key]) {
        swipeableRefs.current[key]?.close();
      }
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  };

  if (!isLoaded || loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="mt-3 text-gray-500">
          Loading notifications...
        </Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View className="flex-1 bg-white">
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
            height: insets.top + 100,
          }}
        />
        <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 20 }}>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={28} color="#065f46" />
            </TouchableOpacity>
            <Text className="ml-4 text-2xl font-bold text-emerald-800">
              Notifications
            </Text>
          </View>
        </View>

        <View className="flex-1 justify-center items-center">
          <View className="bg-gray-100 rounded-full p-6 mb-4">
            <Ionicons name="notifications-off-outline" size={48} color="#9ca3af" />
          </View>
          <Text className="text-gray-400 text-lg font-medium mt-3">
            No notifications yet
          </Text>
          <Text className="text-gray-400 text-sm mt-1">
            You're all caught up!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1 bg-white">
      {/* Gradient Background - Fixed */}
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

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 20,
          paddingBottom: 20,
          paddingHorizontal: 20,
          backgroundColor: "transparent",
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={28} color="#065f46" />
            </TouchableOpacity>

            <Text className="ml-4 text-2xl font-bold text-emerald-800">
              Notifications
            </Text>
          </View>

          {/* MARK ALL BUTTON */}
          {data.some((item) => !item.is_read) && (
            <TouchableOpacity
              onPress={async () => {
                closeAllSwipeables();
                try {
                  await api.put(`/notifications/user/${user.id}/read-all`);
                  fetchNotifications();
                } catch (e) {
                  console.log("READ ALL ERROR:", e);
                }
              }}
            >
              <Text className="text-emerald-700 font-semibold text-sm">
                Mark all read
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={sections}
        keyExtractor={(item, index) => `${item.title}-${index}`}
        contentContainerStyle={{
          paddingBottom: 16,
          backgroundColor: "transparent",
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#10b981"]}
            tintColor="#10b981"
          />
        }
        renderItem={({ item: section }) => (
          <View>
            {/* Section Header */}
            <View style={{
              backgroundColor: "#f3f4f6",
              paddingHorizontal: 16,
              paddingVertical: 8,
              marginTop: 8,
            }}>
              <Text style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#374151",
              }}>
                {section.title}
              </Text>
            </View>
            
            {/* Section Items */}
            {section.data.map((item) => (
              <Swipeable
                key={item.id}
                ref={(ref) => {
                  if (ref) {
                    swipeableRefs.current[item.id] = ref;
                  }
                }}
                renderRightActions={(progress, dragX) =>
                  renderRightActions(progress, dragX, item.id)
                }
                friction={2}
                rightThreshold={40}
                overshootRight={false}
                overshootFriction={10}
                onSwipeableWillOpen={() => {
                  closeOtherSwipeables(item.id);
                }}
                onSwipeableOpen={() => {
                  setOpenedSwipeableId(item.id);
                }}
                onSwipeableClose={() => {
                  setOpenedSwipeableId(null);
                }}
                enableTrackpadTwoFingerGesture
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    if (!item.is_read) {
                      markAsRead(item.id);
                    }
                  }}
                  style={{
                    height: 85,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: item.is_read ? "#ffffff" : "#ecfdf5",
                    borderBottomWidth: 1,
                    borderBottomColor: "#f0f0f0",
                    opacity: deletingId === item.id ? 0.5 : 1,
                  }}
                >
                  <View className="flex-row items-center h-full">
                    <View className={`rounded-full p-2 mr-3 ${item.is_read ? "bg-gray-100" : "bg-emerald-100"
                      }`}>
                      <Ionicons
                        name={item.is_read ? "notifications-outline" : "notifications"}
                        size={18}
                        color={item.is_read ? "#6b7280" : "#059669"}
                      />
                    </View>

                    <View className="flex-1">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text
                          style={{
                            fontWeight: "600",
                            fontSize: 16,
                            color: item.is_read ? "#374151" : "#065f46",
                            flex: 1,
                          }}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        {!item.is_read && (
                          <View className="w-2 h-2 bg-emerald-500 rounded-full ml-2" />
                        )}
                      </View>

                      <Text
                        style={{
                          fontSize: 14,
                          color: item.is_read ? "#6b7280" : "#374151",
                          lineHeight: 20,
                        }}
                        numberOfLines={1}
                      >
                        {item.message}
                      </Text>

                      {item.created_at && (
                        <View className="flex-row items-center mt-1">
                          <Ionicons name="time-outline" size={12} color="#9ca3af" />
                          <Text style={{ fontSize: 12, color: "#9ca3af", marginLeft: 4 }}>
                            {getTimeAgo(item.created_at)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </Swipeable>
            ))}
          </View>
        )}
      />
    </GestureHandlerRootView>
  );
}