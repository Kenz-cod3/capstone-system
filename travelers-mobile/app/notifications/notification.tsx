import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Modal,
  ScrollView,
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
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

type NotificationType = {
  id: number;
  user_id?: number;
  booking_id?: number;
  title: string;
  message: string;
  is_read?: boolean;
  created_at?: string;
};

type Section = {
  title: string;
  data: NotificationType[];
};

// Row height is shared by the notification row and the swipe-delete action
// so they always line up. Raised from 85 so a 2-line message fits.
const ROW_HEIGHT = 105;

export default function Notification() {
  const [data, setData] = useState<NotificationType[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [openedSwipeableId, setOpenedSwipeableId] = useState<number | null>(
    null,
  );
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationType | null>(null);

  const [showNotificationDetails, setShowNotificationDetails] = useState(false);
  const isProcessingRead = useRef(false);

  const { user, isLoaded } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchNotifications(true);
      }
    }, [user]),
  );

  const fetchNotifications = async (showLoader = false) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const res = await api.get(`/notifications/user/${user.id}`);

      const result = res.data?.data || res.data;
      const notifications = Array.isArray(result) ? result : [];

      setData(notifications);
      groupNotificationsByDate(notifications);
    } catch (error) {
      console.log("NOTIFICATION ERROR:", error);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

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
        const daysAgo = Math.floor(
          (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysAgo < 7) {
          sectionTitle = `${daysAgo} days ago`;
        } else {
          sectionTitle = date.toLocaleDateString();
        }
      }

      if (!grouped[sectionTitle]) grouped[sectionTitle] = [];
      grouped[sectionTitle].push(item);
    });

    const sectionOrder = ["Latest", "Yesterday"];
    const orderedSections: Section[] = [];

    sectionOrder.forEach((title) => {
      if (grouped[title]) {
        orderedSections.push({ title, data: grouped[title] });
        delete grouped[title];
      }
    });

    const remainingSections = Object.keys(grouped).sort((a, b) => {
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications(false);
    setRefreshing(false);
  };

  const markAsRead = async (id: number) => {
    if (isProcessingRead.current) return;

    isProcessingRead.current = true;

    try {
      await api.put(`/notifications/${id}/read`);

      const updatedData = data.map((item) =>
        item.id === id ? { ...item, is_read: true } : item,
      );

      setData(updatedData);
      groupNotificationsByDate(updatedData);
    } catch (error) {
      console.log(error);
    } finally {
      isProcessingRead.current = false;
    }
  };

  const markAsUnread = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/unread`);

      const updatedData = data.map((item) =>
        item.id === id ? { ...item, is_read: false } : item,
      );

      setData(updatedData);
      groupNotificationsByDate(updatedData);

      setSelectedNotification((current) =>
        current && current.id === id ? { ...current, is_read: false } : current,
      );
    } catch (error) {
      console.log("MARK AS UNREAD ERROR:", error);
    }
  };

  const openNotificationDetails = async (item: NotificationType) => {
    // Close any opened swipe action first
    if (swipeableRefs.current[item.id]) {
      swipeableRefs.current[item.id]?.close();
    }

    setOpenedSwipeableId(null);

    // Show notification details FIRST
    setSelectedNotification(item);
    setShowNotificationDetails(true);

    // Mark as read
    if (!item.is_read) {
      await markAsRead(item.id);
    }
  };

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

  const closeAllSwipeables = () => {
    Object.keys(swipeableRefs.current).forEach((key) => {
      swipeableRefs.current[key]?.close();
    });
    setOpenedSwipeableId(null);
  };

  const closeOtherSwipeables = (currentId: number) => {
    Object.keys(swipeableRefs.current).forEach((key) => {
      const id = parseInt(key);
      if (id !== currentId) {
        swipeableRefs.current[key]?.close();
      }
    });
  };

  const renderRightActions = (progress: any, dragX: any, id: number) => {
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
          height: ROW_HEIGHT,
          backgroundColor: "#dc2626",
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
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={22} color="#fff" />
              <Text
                style={{
                  color: "#fff",
                  fontSize: 11,
                  marginTop: 4,
                  letterSpacing: 1,
                }}
              >
                Delete
              </Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
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

  // ── LOADING ──
  if (!isLoaded || loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#faf8f3",
        }}
      >
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            borderWidth: 1,
            borderColor: "rgba(26,74,53,0.2)",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <ActivityIndicator size="large" color="#1a4a35" />
        </View>
        <Text
          style={{
            color: "#1a4a35",
            fontSize: 14,
            letterSpacing: 3,
            textTransform: "uppercase",
            fontFamily: "Georgia",
          }}
        >
          Loading
        </Text>
      </View>
    );
  }

  // ── EMPTY ──
  if (data.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: "#faf8f3" }}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />

        <LinearGradient
          colors={["#0d2e1f", "#1a4a35"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 16,
            paddingBottom: 28,
            paddingHorizontal: 24,
          }}
        >
          {/* Decorative circles */}
          <View
            style={{
              position: "absolute",
              width: 240,
              height: 240,
              top: -60,
              right: -60,
              borderRadius: 120,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.05)",
            }}
          />
          <View
            style={{
              position: "absolute",
              width: 140,
              height: 140,
              top: -10,
              right: -10,
              borderRadius: 70,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.05)",
            }}
          />

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(0,0,0,0.2)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
                justifyContent: "center",
                alignItems: "center",
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ marginLeft: 16 }}>
              <Text
                style={{
                  color: "#c9a96e",
                  fontSize: 10,
                  letterSpacing: 4,
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                Lyn Enia's Inn
              </Text>
              <Text
                style={{ color: "#fff", fontSize: 28, fontFamily: "Georgia" }}
              >
                Notifications
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 32,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "rgba(26,74,53,0.06)",
              borderWidth: 1,
              borderColor: "rgba(26,74,53,0.1)",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons
              name="notifications-off-outline"
              size={32}
              color="#1a4a35"
              style={{ opacity: 0.4 }}
            />
          </View>
          <Text
            style={{
              color: "#1a4a35",
              fontSize: 18,
              fontFamily: "Georgia",
              marginBottom: 8,
            }}
          >
            No notifications yet
          </Text>
          <Text
            style={{
              color: "rgba(26,74,53,0.4)",
              fontSize: 13,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            You're all caught up!
          </Text>
        </View>
      </View>
    );
  }

  // ── MAIN ──
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#faf8f3" }}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      {/* ── HEADER ── */}
      <LinearGradient
        colors={["#0d2e1f", "#1a4a35"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 28,
          paddingHorizontal: 24,
        }}
      >
        {/* Decorative circles */}
        <View
          style={{
            position: "absolute",
            width: 240,
            height: 240,
            top: -60,
            right: -60,
            borderRadius: 120,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.05)",
          }}
        />
        <View
          style={{
            position: "absolute",
            width: 140,
            height: 140,
            top: -10,
            right: -10,
            borderRadius: 70,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.05)",
          }}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Back + title */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(0,0,0,0.2)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
                justifyContent: "center",
                alignItems: "center",
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ marginLeft: 16 }}>
              <Text
                style={{
                  color: "#c9a96e",
                  fontSize: 10,
                  letterSpacing: 4,
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                Lyn Enia's Inn
              </Text>
              <Text
                style={{ color: "#fff", fontSize: 28, fontFamily: "Georgia" }}
              >
                Notifications
              </Text>
            </View>
          </View>

          {/* Mark all read */}
          {data.some((item) => !item.is_read) && (
            <TouchableOpacity
              onPress={async () => {
                closeAllSwipeables();
                try {
                  await api.put(`/notifications/user/${user.id}/read-all`);
                  await fetchNotifications(false);
                } catch (e) {
                  console.log("READ ALL ERROR:", e);
                }
              }}
              style={{
                backgroundColor: "rgba(201,169,110,0.15)",
                borderWidth: 1,
                borderColor: "rgba(201,169,110,0.3)",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
              }}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  color: "#c9a96e",
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Mark all read
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── LIST ── */}
      <FlatList
        data={sections}
        keyExtractor={(item, index) => `${item.title}-${index}`}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1a4a35"]}
            tintColor="#1a4a35"
          />
        }
        renderItem={({ item: section }) => (
          <View>
            {/* Section label */}
            <View
              style={{
                paddingHorizontal: 24,
                paddingVertical: 10,
                marginTop: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: "rgba(26,74,53,0.4)",
                  fontFamily: "Georgia",
                }}
              >
                {section.title}
              </Text>
            </View>

            {/* Items */}
            {section.data.map((item) => (
              <Swipeable
                key={item.id}
                ref={(ref) => {
                  if (ref) swipeableRefs.current[item.id] = ref;
                }}
                renderRightActions={(progress, dragX) =>
                  renderRightActions(progress, dragX, item.id)
                }
                friction={2}
                rightThreshold={40}
                overshootRight={false}
                overshootFriction={10}
                onSwipeableWillOpen={() => closeOtherSwipeables(item.id)}
                onSwipeableOpen={() => setOpenedSwipeableId(item.id)}
                onSwipeableClose={() => setOpenedSwipeableId(null)}
                enableTrackpadTwoFingerGesture
              >
                <TouchableOpacity
                  delayPressIn={100}
                  activeOpacity={0.7}
                  onPress={() => openNotificationDetails(item)}
                  style={{
                    height: ROW_HEIGHT,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    backgroundColor: item.is_read
                      ? "#faf8f3"
                      : "rgba(26,74,53,0.04)",
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(26,74,53,0.06)",
                    opacity: deletingId === item.id ? 0.4 : 1,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  {/* Icon */}
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: item.is_read
                        ? "rgba(26,74,53,0.06)"
                        : "rgba(201,169,110,0.12)",
                      borderWidth: 1,
                      borderColor: item.is_read
                        ? "rgba(26,74,53,0.1)"
                        : "rgba(201,169,110,0.25)",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 14,
                    }}
                  >
                    <Ionicons
                      name={
                        item.is_read ? "notifications-outline" : "notifications"
                      }
                      size={18}
                      color={item.is_read ? "rgba(26,74,53,0.35)" : "#c9a96e"}
                    />
                  </View>

                  {/* Text */}
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 3,
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontFamily: "Georgia",
                          color: item.is_read
                            ? "rgba(26,74,53,0.5)"
                            : "#1a4a35",
                        }}
                      >
                        {item.title}
                      </Text>
                      {/* Unread dot */}
                      {!item.is_read && (
                        <View
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 4,
                            backgroundColor: "#c9a96e",
                            marginLeft: 8,
                          }}
                        />
                      )}
                    </View>

                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: 12,
                        color: item.is_read
                          ? "rgba(26,74,53,0.35)"
                          : "rgba(26,74,53,0.6)",
                        lineHeight: 18,
                      }}
                    >
                      {item.message}
                    </Text>

                    {item.created_at && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 3,
                        }}
                      >
                        <Ionicons
                          name="time-outline"
                          size={11}
                          color="rgba(26,74,53,0.3)"
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            color: "rgba(26,74,53,0.3)",
                            marginLeft: 3,
                            letterSpacing: 0.5,
                          }}
                        >
                          {getTimeAgo(item.created_at)}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </Swipeable>
            ))}
          </View>
        )}
      />
      {/* =====================================================
    NOTIFICATION DETAILS MODAL
===================================================== */}

      <Modal
        visible={showNotificationDetails}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowNotificationDetails(false);
          setSelectedNotification(null);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#faf8f3",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: "75%",
              paddingBottom: insets.bottom + 20,
            }}
          >
            {/* HANDLE */}
            <View
              style={{
                width: 42,
                height: 5,
                borderRadius: 3,
                backgroundColor: "rgba(26,74,53,0.15)",
                alignSelf: "center",
                marginTop: 10,
                marginBottom: 8,
              }}
            />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: 12,
              }}
            >
              {/* HEADER */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 22,
                }}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: "rgba(201,169,110,0.14)",
                    borderWidth: 1,
                    borderColor: "rgba(201,169,110,0.3)",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 14,
                  }}
                >
                  <Ionicons name="notifications" size={23} color="#c9a96e" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 20,
                      color: "#1a4a35",
                      fontFamily: "Georgia",
                    }}
                  >
                    {selectedNotification?.title}
                  </Text>

                  {selectedNotification?.created_at && (
                    <Text
                      style={{
                        fontSize: 11,
                        color: "rgba(26,74,53,0.4)",
                        marginTop: 4,
                      }}
                    >
                      {getTimeAgo(selectedNotification.created_at)}
                    </Text>
                  )}
                </View>

                {/* CLOSE */}
                <TouchableOpacity
                  onPress={() => {
                    setShowNotificationDetails(false);
                    setSelectedNotification(null);
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "rgba(26,74,53,0.06)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="close" size={20} color="#1a4a35" />
                </TouchableOpacity>
              </View>

              {/* DETAILS */}
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 20,
                  padding: 18,
                  borderWidth: 1,
                  borderColor: "rgba(26,74,53,0.08)",
                  marginBottom: 18,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: "rgba(26,74,53,0.4)",
                    marginBottom: 10,
                  }}
                >
                  Notification Details
                </Text>

                <Text
                  style={{
                    fontSize: 15,
                    lineHeight: 23,
                    color: "rgba(26,74,53,0.75)",
                  }}
                >
                  {selectedNotification?.message}
                </Text>
              </View>

              {/* VIEW BOOKING */}
              {selectedNotification?.booking_id && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    const bookingId = selectedNotification.booking_id;

                    setShowNotificationDetails(false);
                    setSelectedNotification(null);

                    if (bookingId) {
                      router.push({
                        pathname: "/bookings",
                        params: {
                          booking_id: String(bookingId),
                        },
                      });
                    }
                  }}
                  style={{
                    backgroundColor: "#1a4a35",
                    height: 52,
                    borderRadius: 18,
                    justifyContent: "center",
                    alignItems: "center",
                    flexDirection: "row",
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: "600",
                      letterSpacing: 1,
                    }}
                  >
                    VIEW BOOKING
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={17}
                    color="#c9a96e"
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>
              )}

              {/* CLOSE */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setShowNotificationDetails(false);
                  setSelectedNotification(null);
                }}
                style={{
                  height: 48,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: "rgba(26,74,53,0.12)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#1a4a35",
                    fontSize: 13,
                    letterSpacing: 1,
                    fontWeight: "500",
                  }}
                >
                  CLOSE
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}