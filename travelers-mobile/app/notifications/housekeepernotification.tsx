import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  FlatList,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import api from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { ArrowLeft, CheckCircle2 } from "lucide-react-native";

/* =========================================================
   TYPES
========================================================= */

type RoomTask = {
  id: number;
  room_number?: string | number;
  room_type?: string;
  status?: string;
  last_guest_name?: string | null;
  check_out_time?: string | null;
  checkout_staff_name?: string | null;
  updated_at?: string;
};

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  is_read: boolean | number;
  created_at?: string;
};

/* =========================================================
   FORMAT HELPERS
========================================================= */

const formatDate = (value?: string | null) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (value?: string | null) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "Not available";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const timeAgo = (value?: string | null) => {
  if (!value) return "";
  const diffMs = Math.max(0, Date.now() - new Date(value).getTime());
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
};

// Unique per room "event" — changes whenever the room record updates.
const keyFor = (room: RoomTask) => `${room.id}-${room.updated_at ?? "legacy"}`;

/* =========================================================
   HOUSEKEEPER NOTIFICATION
========================================================= */

export default function HousekeeperNotification() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const user = useAuthStore((s) => s.user);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [rooms, setRooms] = useState<RoomTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const [selected, setSelected] = useState<RoomTask | null>(null);
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  /* =======================================================
     FETCH ROOMS THAT NEED CLEANING
  ======================================================= */

  const fetchRooms = async (isRefresh = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (!isRefresh) setLoading(true);

    try {
      // Get housekeeper tasks
      const roomsRes = await api.get("/housekeeper/tasks");

      const roomsData: RoomTask[] = Array.isArray(roomsRes.data)
        ? roomsRes.data
        : (roomsRes.data?.data ?? []);

      setRooms(roomsData);

      if (!user) {
        console.log("No logged-in user found.");
        return;
      }

      console.log("Logged-in housekeeper ID:", user.id);

      const notificationsRes = await api.get(`/notifications/user/${user.id}`);

      const notificationsData: NotificationItem[] = Array.isArray(
        notificationsRes.data,
      )
        ? notificationsRes.data
        : (notificationsRes.data?.data ?? []);

      setNotifications(notificationsData);
    } catch (error: any) {
      console.log(
        "Error fetching notifications:",
        error?.response?.data || error?.message || error,
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchRooms();
      }

      return undefined;
    }, [user]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRooms(true);
  };

  /* =======================================================
     READ / UNREAD
  ======================================================= */

  const isUnread = (notification: NotificationItem) =>
    notification.is_read === false || notification.is_read === 0;

  const markRead = async (notification: NotificationItem) => {
    if (notification.is_read === true || notification.is_read === 1) {
      return;
    }

    try {
      await api.put(`/notifications/${notification.id}/read`);

      // Update UI immediately
      setNotifications((currentNotifications) =>
        currentNotifications.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                is_read: true,
              }
            : item,
        ),
      );

      console.log(`Notification ${notification.id} marked as read.`);
    } catch (error: any) {
      console.log(
        "Error marking notification as read:",
        error?.response?.data || error?.message || error,
      );
    }
  };

  const markUnread = async (notification: NotificationItem) => {
    console.log("Mark as unread will be connected to the database next.");
  };
  /* =======================================================
     MODAL
  ======================================================= */

  const openDetails = async (notification: NotificationItem) => {
    // Mark notification as read immediately
    await markRead(notification);

    // Try to find the room from the notification message
    const room = rooms.find((item) =>
      notification.message.includes(`Room ${item.room_number}`),
    );

    setSelected(room ?? null);
    setSelectedNotification(notification);
    setModalVisible(true);
  };

  const closeDetails = () => {
    setModalVisible(false);
    setSelected(null);
  };

  const proceed = async () => {
    if (!selected) {
      closeDetails();
      return;
    }

    const room = selected;

    closeDetails();

    router.push({
      pathname: "/tasks",
      params: {
        roomId: room.id.toString(),
      },
    });
  };

  const visibleNotifications = showAll
    ? notifications
    : notifications.slice(0, 8);

  /* =======================================================
     RENDER ITEM
  ======================================================= */

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const unread = isUnread(item);

    const roomNumber =
      item.message.match(/Room\s+(.+?)\s+is ready/)?.[1] ?? "Unknown";

    return (
      <View
        style={{
          backgroundColor: unread ? "#ECFBF4" : "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#EEF2F0",
        }}
      >
        {unread && (
          <View
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              backgroundColor: "#14966E",
            }}
          />
        )}

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => openDetails(item)}
          style={{
            paddingHorizontal: 20,
            paddingVertical: 16,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: unread ? "#DDF7EB" : "#F1F5F9",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: 5,
                backgroundColor: unread ? "#14966E" : "#94A3B8",
              }}
            />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: unread ? "900" : "800",
                  color: "#0F172A",
                }}
              >
                New Cleaning Task
              </Text>

              {unread && (
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: "#14966E",
                    marginLeft: 7,
                  }}
                />
              )}
            </View>

            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#26332E",
                marginTop: 3,
              }}
            >
              Room {roomNumber}
            </Text>

            <Text style={{ fontSize: 10, color: "#7B8794", marginTop: 3 }}>
              {item.message}
            </Text>
          </View>

          <Text
            style={{
              fontSize: 9,
              fontWeight: "800",
              color: "#89928D",
              marginLeft: 8,
              minWidth: 25,
              textAlign: "right",
            }}
          >
            {timeAgo(item.created_at)}
          </Text>
        </TouchableOpacity>

        {!unread && (
          <Pressable
            onPress={() => markUnread(item)}
            style={{ paddingHorizontal: 20, paddingBottom: 10 }}
          >
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#14966E" }}>
              Mark as unread
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: "#F5F1E6" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3D2E" />

      {/* HEADER */}
      <View
        style={{
          backgroundColor: "#0B3D2E",
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
          paddingBottom: 20,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: "#1F6E52",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <ArrowLeft size={21} color="#F5F1E6" />
          </TouchableOpacity>

          <Text style={{ fontSize: 22, fontWeight: "800", color: "#FFFFFF" }}>
            Notifications
          </Text>
        </View>
      </View>

      {/* SECTION HEADER */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 22,
          paddingBottom: 11,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>
            Notifications
          </Text>
          <Text style={{ fontSize: 9, color: "#7B8794", marginTop: 3 }}>
            Recent housekeeping notifications
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "#EAF8F2",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: "800", color: "#0B6B4F" }}>
            {notifications.length} notification
            {notifications.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* SHOW ALL / SHOW LESS */}
      {notifications.length > 5 && (
        <View
          style={{
            alignItems: "flex-end",
            paddingHorizontal: 20,
            marginBottom: 10,
          }}
        >
          <TouchableOpacity
            onPress={() => setShowAll((p) => !p)}
            activeOpacity={0.6}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#14966E" }}>
              {showAll ? "Show Less" : "Show All"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* LIST */}
      <FlatList
        data={visibleNotifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#14966E"]}
            tintColor="#14966E"
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ alignItems: "center", paddingVertical: 70 }}>
              <ActivityIndicator size="large" color="#14966E" />
              <Text style={{ fontSize: 11, color: "#7B8794", marginTop: 10 }}>
                Checking rooms...
              </Text>
            </View>
          ) : (
            <View
              style={{
                marginHorizontal: 20,
                marginTop: 20,
                backgroundColor: "#FFFFFF",
                borderRadius: 18,
                paddingVertical: 38,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 31,
                  backgroundColor: "#EAF8F2",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <CheckCircle2 size={29} color="#14966E" />
              </View>

              <Text
                style={{ fontSize: 17, fontWeight: "800", color: "#0F172A" }}
              >
                All Rooms Are Clean
              </Text>
              <Text style={{ fontSize: 10, color: "#7B8794", marginTop: 5 }}>
                You have no notifications yet.
              </Text>
            </View>
          )
        }
      />

      {/* DETAILS MODAL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDetails}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFDF7",
              borderRadius: 22,
              padding: 22,
            }}
          >
            {/* MODAL HEADER */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 18,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "#EAF8F2",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <View
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: 6,
                      backgroundColor: "#14966E",
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: "800",
                      color: "#0F172A",
                    }}
                  >
                    Cleaning Task
                  </Text>
                  <Text
                    style={{ fontSize: 10, color: "#7B8794", marginTop: 2 }}
                  >
                    New room ongoing assignment
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={closeDetails}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: "#EEEAE0",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 18, color: "#59655F" }}>×</Text>
              </TouchableOpacity>
            </View>

            {/* ROOM DETAILS */}
            <View
              style={{
                backgroundColor: "#F5F1E6",
                borderRadius: 15,
                padding: 15,
                marginBottom: 18,
              }}
            >
              <DetailRow
                label="ROOM"
                value={`Room ${selected?.room_number ?? selected?.id ?? ""}`}
                big
              />
              <Divider />

              <DetailRow
                label="ROOM TYPE"
                value={selected?.room_type ?? "Standard Room"}
              />
              <Divider />

              <DetailRow
                label="LAST CHECKED-IN GUEST"
                value={
                  selected?.last_guest_name ?? "Guest information unavailable"
                }
              />
              <Divider />

              <DetailRow
                label="CHECKED OUT"
                value={
                  selected?.check_out_time
                    ? `${formatDate(selected.check_out_time)} at ${formatTime(selected.check_out_time)}`
                    : "Checkout information unavailable"
                }
              />
              <Divider />

              <DetailRow
                label="CHECKED OUT BY"
                value={
                  selected?.checkout_staff_name ??
                  "Staff information unavailable"
                }
              />
              <Divider />

              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "800",
                  color: "#7B8794",
                  marginBottom: 5,
                }}
              >
                STATUS
              </Text>
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: "#FFF0EE",
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{ fontSize: 9, fontWeight: "800", color: "#DC2626" }}
                >
                  Needs Cleaning
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontSize: 12,
                color: "#59655F",
                lineHeight: 18,
                marginBottom: 20,
              }}
            >
              This room has been assigned to you for cleaning. Review the room
              details before proceeding.
            </Text>

            {/* BUTTONS */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={closeDetails}
                style={{
                  flex: 1,
                  backgroundColor: "#EEEAE0",
                  paddingVertical: 13,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#59655F", fontSize: 12, fontWeight: "700" }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={proceed}
                style={{
                  flex: 1,
                  backgroundColor: "#0B3D2E",
                  paddingVertical: 13,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "800" }}
                >
                  Proceed
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* =========================================================
   SMALL HELPERS
========================================================= */

function DetailRow({
  label,
  value,
  big,
}: {
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <>
      <Text
        style={{
          fontSize: 9,
          fontWeight: "800",
          color: "#7B8794",
          marginBottom: 5,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: big ? 21 : 13,
          fontWeight: "800",
          color: big ? "#0B3D2E" : "#26332E",
        }}
      >
        {value}
      </Text>
    </>
  );
}

function Divider() {
  return (
    <View
      style={{ height: 1, backgroundColor: "#E2DED2", marginVertical: 12 }}
    />
  );
}
