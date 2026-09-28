import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Image,
  Modal,
} from "react-native";

import { useState, useCallback, useEffect } from "react";
import { InteractionManager } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";

import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";

import api from "@/services/api";
import { registerForPushNotificationsAsync } from "@/services/notifications";
import { useAuthStore } from "@/store/authStore";

import {
  Clock,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
  Bell,
  Home,
  ShieldAlert,
  Droplets,
  Calendar,
  Sun,
  Moon,
  CloudSun,
  Users,
  Bed,
  FileText,
  Leaf,
} from "lucide-react-native";

/* =========================================================
   DASHBOARD
========================================================= */

export default function Dashboard() {
  const router = useRouter();

  const user = useAuthStore((s) => s.user);

  /* =========================================================
     PUSH NOTIFICATION REGISTRATION
  ========================================================= */

  useEffect(() => {
    const registerPushNotifications = async () => {
      try {
        const token = await registerForPushNotificationsAsync();

        if (token) {
          console.log("Housekeeper Expo Push Token:", token);

          try {
            await api.post("/housekeeper/push-token", {
              expo_push_token: token,
            });

            console.log("Push token saved to Laravel.");
          } catch (error) {
            console.log("Failed to save push token:", error);
          }
        }
      } catch (error) {
        console.log("Push notification registration error:", error);
      }
    };

    const task = InteractionManager.runAfterInteractions(() => {
      registerPushNotifications();
    });

    return () => task.cancel();
  }, []);

  const [tasks, setTasks] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedRoomImages, setSelectedRoomImages] = useState<string[]>([]);
  const [selectedRoomImageIndex, setSelectedRoomImageIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  const [openingNotifications, setOpeningNotifications] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    damaged: 0,
  });

  /* =======================================================
     ROOM IMAGE GALLERY FUNCTIONS
  ======================================================= */

  const openRoomGallery = (item: any) => {
    const images =
      item.room_images?.length > 0
        ? item.room_images
        : item.image_url
          ? [item.image_url]
          : [];

    if (images.length === 0) return;

    setSelectedRoomImages(images);
    setSelectedRoomImageIndex(0);
  };

  const closeRoomGallery = () => {
    setSelectedRoomImages([]);
    setSelectedRoomImageIndex(0);
  };

  const showPreviousRoomImage = () => {
    setSelectedRoomImageIndex((prev) =>
      prev === 0 ? selectedRoomImages.length - 1 : prev - 1,
    );
  };

  const showNextRoomImage = () => {
    setSelectedRoomImageIndex((prev) =>
      prev === selectedRoomImages.length - 1 ? 0 : prev + 1,
    );
  };

  /* =======================================================
     FETCH TASKS + HISTORY
  ======================================================= */

  const getTasks = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }

      const [tasksRes, historyRes] = await Promise.all([
        api.get("/housekeeper/tasks?per_page=all"),
        api.get("/housekeeper/history?per_page=all"),
      ]);

      const data: any[] = Array.isArray(tasksRes.data)
        ? tasksRes.data
        : tasksRes.data?.data || [];

      const historyData: any[] = Array.isArray(historyRes.data)
        ? historyRes.data
        : historyRes.data?.data || [];

      const ongoingTasks = data.filter(
        (t: any) =>
          t.status === "preparing" ||
          t.status === "ongoing" ||
          t.status === "maintenance",
      );

      const tasksWithRoomImages = await Promise.all(
        ongoingTasks.map(async (task: any) => {
          try {
            const roomRes = await api.get(`/rooms/${task.id}`);
            const room = roomRes.data;

            const normalImages = Array.isArray(room.images)
              ? room.images
                  .filter(
                    (img: any) =>
                      img.image_type === "normal" || !img.image_type,
                  )
                  .map((img: any) => img.url || img.image_url)
                  .filter(Boolean)
              : [];

            const galleryImages =
              normalImages.length > 0
                ? normalImages
                : room.image_url
                  ? [room.image_url]
                  : task.image_url
                    ? [task.image_url]
                    : [];

            return {
              ...task,
              image_url: galleryImages[0] || null,
              room_images: galleryImages,
              panorama_url: room.panorama_url || null,
            };
          } catch (error) {
            console.log(
              `Failed to load room images for room ${task.id}:`,
              error,
            );

            return {
              ...task,
              image_url: task.image_url || null,
              room_images: task.image_url ? [task.image_url] : [],
              panorama_url: null,
            };
          }
        }),
      );

      setTasks(tasksWithRoomImages);
      setHistory(historyData);

      setStats({
        total: data.length + historyData.length,
        completed: historyData.length,
        pending: data.filter((t: any) => t.status === "preparing").length,
        inProgress: data.filter((t: any) => t.status === "ongoing").length,
        damaged: data.filter(
          (t: any) =>
            t.has_damage || t.damage_summary || t.status === "maintenance",
        ).length,
      });
    } catch (error) {
      console.log("Dashboard error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* =======================================================
     REFRESH WHEN SCREEN IS FOCUSED
  ======================================================= */

  useFocusEffect(
    useCallback(() => {
      getTasks();
      checkNotificationStatus();

      const interval = setInterval(() => {
        checkNotificationStatus();
      }, 20000);

      return () => clearInterval(interval);
    }, []),
  );

  /* =======================================================
     PULL TO REFRESH
  ======================================================= */

  const onRefresh = () => {
    setRefreshing(true);
    getTasks(true);
  };

  /* =======================================================
     NOTIFICATION STATUS
  ======================================================= */

  const checkNotificationStatus = async () => {
    try {
      const res = await api.get("/housekeeper/tasks");

      const data: any[] = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];

      const preparingRooms = data.filter(
        (room: any) => room.status === "preparing",
      );

      setHasUnreadNotifications(preparingRooms.length > 0);
    } catch (error) {
      console.log("Notification status error:", error);

      setHasUnreadNotifications(false);
    }
  };

  const openHousekeeperNotifications = async () => {
    if (openingNotifications) return;

    setOpeningNotifications(true);

    try {
      router.push("/notifications/housekeepernotification");
    } catch (error) {
      console.log("Open notification error:", error);
    } finally {
      setTimeout(() => {
        setOpeningNotifications(false);
      }, 500);
    }
  };

  /* =======================================================
     GREETING
  ======================================================= */

  const greeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return {
        text: "Good morning",
        icon: Sun,
        color: "#C9A227",
      };
    }

    if (hour < 17) {
      return {
        text: "Good afternoon",
        icon: CloudSun,
        color: "#C9A227",
      };
    }

    return {
      text: "Good evening",
      icon: Moon,
      color: "#C9A227",
    };
  };

  const greetingData = greeting();

  const GreetingIcon = greetingData.icon;

  const firstName = user?.first_name || "Housekeeper";

  /* =======================================================
     COMPLETION RATE
  ======================================================= */

  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  /* =======================================================
     PRIORITY TASKS
  ======================================================= */

  const previewTasks = [...tasks]
    .sort((a: any, b: any) => {
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;

      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;

      return dateA - dateB;
    })
    .slice(0, showAll ? tasks.length : 5);

  /* =======================================================
     ATTENTION REQUIRED
  ======================================================= */

  const attentionTasks = tasks.filter(
    (item: any) => item.status === "maintenance" && item.has_damage === true,
  );

  /* =======================================================
     STATUS CONFIG
  ======================================================= */

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "ongoing":
        return {
          bg: "#FFF8E6",
          border: "#EAD18A",
          dot: "#C9A227",
          badge: "#FFF1C7",
          badgeText: "#856404",
          label: "In Progress",
          color: "#C9A227",
        };

      case "preparing":
        return {
          bg: "#FFF1F0",
          border: "#F4C7C3",
          dot: "#DC2626",
          badge: "#FFF0EE",
          badgeText: "#B91C1C",
          label: "Needs Cleaning",
          color: "#DC2626",
        };

      case "maintenance":
        return {
          bg: "#F3F0FB",
          border: "#D8D0EF",
          dot: "#7357C7",
          badge: "#ECE7FA",
          badgeText: "#5B42A5",
          label: "Maintenance",
          color: "#7357C7",
        };

      default:
        return {
          bg: "#F5F1E6",
          border: "#DDD8CB",
          dot: "#7B8794",
          badge: "#EEEAE0",
          badgeText: "#52605A",
          label: "Unknown",
          color: "#7B8794",
        };
    }
  };

  /* =======================================================
     ROOM PREVIEW CARD
  ======================================================= */

  const RoomPreviewCard = ({ item }: { item: any }) => {
    const config = getStatusConfig(item.status);

    const goToRoom = () =>
      router.push({
        pathname: "/tasks",
        params: {
          roomId: item.id,
        },
      });

    return (
      <View
        style={{
          marginHorizontal: 20,
          marginBottom: 12,
          backgroundColor: "#FFFFFF",
          borderRadius: 18,
          padding: 8,

          shadowColor: "#0B3D2E",
          shadowOffset: {
            width: 0,
            height: 3,
          },
          shadowOpacity: 0.08,
          shadowRadius: 8,

          elevation: 3,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "stretch",
            minHeight: 142,
          }}
        >
          {/* ROOM IMAGE */}

          <View
            style={{
              width: 96,
              height: 142,
              borderRadius: 13,
              overflow: "hidden",
              backgroundColor: "#F5F1E6",
            }}
          >
            {item.image_url ? (
              <Image
                source={{
                  uri: item.image_url,
                }}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Home size={25} color="#7B8794" strokeWidth={1.5} />

                <Text
                  style={{
                    fontSize: 8,
                    color: "#7B8794",
                    marginTop: 4,
                  }}
                >
                  No image
                </Text>
              </View>
            )}
          </View>

          {/* RIGHT CONTENT */}

          <View
            style={{
              flex: 1,
              paddingLeft: 10,
              paddingRight: 5,
              paddingVertical: 4,
              minWidth: 0,
            }}
          >
            {/* STATUS */}

            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor:
                  item.status === "preparing" ? "#FFF1F0" : config.badge,

                paddingHorizontal: 7,
                paddingVertical: 4,
                borderRadius: 12,

                flexDirection: "row",
                alignItems: "center",

                marginBottom: 5,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,

                  backgroundColor:
                    item.status === "preparing" ? "#DC2626" : config.dot,

                  marginRight: 5,
                }}
              />

              <Text
                style={{
                  fontSize: 8,
                  fontWeight: "700",

                  color:
                    item.status === "preparing" ? "#B91C1C" : config.badgeText,
                }}
              >
                {config.label}
              </Text>
            </View>

            {/* ROOM NUMBER */}

            <Text
              style={{
                fontSize: 17,
                fontWeight: "800",
                color: "#0F172A",
                letterSpacing: -0.3,
              }}
              numberOfLines={1}
            >
              Room {item.room_number}
            </Text>

            {/* ROOM TYPE */}

            <Text
              style={{
                fontSize: 10,
                color: "#7B8794",
                marginTop: 1,
                marginBottom: 7,
              }}
              numberOfLines={1}
            >
              {item.room_type || "Room"}
            </Text>

            {/* GUEST + BED */}

            {(item.guests != null || item.beds != null) && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                {item.guests != null && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginRight: 10,
                    }}
                  >
                    <Users size={11} color="#94A3A0" />

                    <Text
                      style={{
                        fontSize: 9,
                        color: "#64746E",
                        marginLeft: 3,
                      }}
                    >
                      {item.guests} Guests
                    </Text>
                  </View>
                )}

                {item.beds != null && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Bed size={11} color="#94A3A0" />

                    <Text
                      style={{
                        fontSize: 9,
                        color: "#64746E",
                        marginLeft: 3,
                      }}
                    >
                      {item.beds} {item.beds === 1 ? "Bed" : "Beds"}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* DIVIDER */}

            <View
              style={{
                height: 1,
                backgroundColor: "#E7ECE8",
                marginBottom: 6,
              }}
            />

            {/* DAMAGE / NORMAL */}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 7,
                minWidth: 0,
              }}
            >
              {item.has_damage && item.damage_summary ? (
                <>
                  <ShieldAlert size={12} color="#DC2626" />

                  <Text
                    style={{
                      flex: 1,
                      fontSize: 9,
                      color: "#DC2626",
                      fontWeight: "600",
                      marginLeft: 4,
                    }}
                    numberOfLines={1}
                  >
                    Damage reported
                  </Text>
                </>
              ) : (
                <>
                  <FileText size={12} color="#7B8794" />

                  <Text
                    style={{
                      flex: 1,
                      fontSize: 9,
                      color: "#7B8794",
                      marginLeft: 4,
                    }}
                    numberOfLines={1}
                  >
                    No damage reported
                  </Text>
                </>
              )}
            </View>

            {/* OPEN BUTTON */}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={goToRoom}
              style={{
                alignSelf: "flex-start",
                backgroundColor: "#C9A227",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 9,

                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "800",
                  color: "#FFFFFF",
                  marginRight: 6,
                }}
              >
                Open
              </Text>

              <ArrowRight size={12} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  /* =======================================================
   HEADER
======================================================= */

  const Header = () => (
    <>
      <View
        style={{
          backgroundColor: "#0B3D2E",
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
          overflow: "hidden",
        }}
      >
        {/* ================================================
          HEADER CONTENT
      ================================================= */}

        <View
          style={{
            paddingTop: 38,
            paddingHorizontal: 16,
            paddingBottom: 18,
          }}
        >
          {/* ============================================
            TOP ROW
        ============================================= */}

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            {/* LEFT SIDE */}

            <View
              style={{
                flex: 1,
                minWidth: 0,
              }}
            >
              {/* GREETING */}

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 2,
                }}
              >
                <GreetingIcon
                  size={14}
                  color={greetingData.color}
                  strokeWidth={1.8}
                />

                <Text
                  style={{
                    color: "rgba(255,255,255,0.78)",
                    fontSize: 10,
                    fontWeight: "500",
                    marginLeft: 6,
                  }}
                >
                  {greetingData.text},
                </Text>
              </View>

              {/* NAME */}

              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 27,
                  fontWeight: "800",
                  letterSpacing: -0.8,
                  lineHeight: 31,
                }}
              >
                {firstName}
              </Text>

              {/* DATE */}

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 3,
                }}
              >
                <Calendar
                  size={10}
                  color="rgba(255,255,255,0.65)"
                  strokeWidth={1.8}
                />

                <Text
                  style={{
                    color: "rgba(255,255,255,0.65)",
                    fontSize: 9,
                    marginLeft: 5,
                  }}
                  numberOfLines={1}
                >
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>

            {/* ==========================================
              NOTIFICATION
          ========================================== */}
            <TouchableOpacity
              activeOpacity={0.82}
              disabled={openingNotifications}
              onPress={openHousekeeperNotifications}
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,

                // solid emerald circle
                backgroundColor: "#1F6E52",

                alignItems: "center",
                justifyContent: "center",

                marginTop: 1,

                // subtle depth
                shadowColor: "#0B3D2E",
                shadowOffset: {
                  width: 0,
                  height: 3,
                },
                shadowOpacity: 0.16,
                shadowRadius: 6,

                elevation: 3,
              }}
            >
              <Bell size={22} color="#F5F1E6" strokeWidth={1.8} />

              {hasUnreadNotifications && (
                <View
                  style={{
                    position: "absolute",
                    top: 7,
                    right: 7,

                    width: 8,
                    height: 8,
                    borderRadius: 4,

                    backgroundColor: "#C9A227",

                    borderWidth: 1.5,
                    borderColor: "#1F6E52",
                  }}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* ================================================
            TODAY'S PROGRESS
        ================================================= */}

          <View
            style={{
              marginTop: 13,

              height: 108,

              borderRadius: 15,

              backgroundColor: "rgba(20,90,67,0.42)",
              borderWidth: 1,
              borderColor: "rgba(105,215,176,0.30)",

              flexDirection: "row",
              alignItems: "center",

              paddingHorizontal: 12,
            }}
          >
            {/* ==========================================
              PROGRESS CIRCLE
          ========================================== */}

            <View
              style={{
                width: 76,
                height: 76,

                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Svg width={76} height={76}>
                {/* BACKGROUND */}

                <Circle
                  cx="38"
                  cy="38"
                  r="31"
                  stroke="rgba(255,255,255,0.13)"
                  strokeWidth="6"
                  fill="none"
                />

                {/* PROGRESS */}

                <Circle
                  cx="38"
                  cy="38"
                  r="31"
                  stroke="#69D7B0"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 31}`}
                  strokeDashoffset={
                    2 * Math.PI * 31 -
                    (completionRate / 100) * (2 * Math.PI * 31)
                  }
                  rotation="-90"
                  origin="38, 38"
                />

                {/* GOLD START/END ACCENT */}

                {completionRate > 0 && (
                  <Circle
                    cx="38"
                    cy="38"
                    r="31"
                    stroke="#C9A227"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 31}`}
                    strokeDashoffset={
                      2 * Math.PI * 31 -
                      (Math.min(completionRate, 20) / 100) * (2 * Math.PI * 31)
                    }
                    rotation="-90"
                    origin="38, 38"
                  />
                )}
              </Svg>

              {/* PERCENT */}

              <View
                style={{
                  position: "absolute",

                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 17,
                    fontWeight: "800",
                    lineHeight: 20,
                  }}
                >
                  {completionRate}%
                </Text>
              </View>
            </View>

            {/* ==========================================
              PROGRESS DETAILS
          ========================================== */}

            <View
              style={{
                flex: 1,
                marginLeft: 11,
                minWidth: 0,
              }}
            >
              {/* TITLE */}

              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: "700",
                  marginBottom: 6,
                }}
              >
                Today's Progress
              </Text>

              {/* COMPLETED */}

              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 11,
                  fontWeight: "700",
                  lineHeight: 14,
                }}
                numberOfLines={2}
              >
                {stats.completed} of {stats.total} rooms
                {"\n"}
                completed
              </Text>

              {/* REMAINING */}

              <Text
                style={{
                  color: "rgba(255,255,255,0.60)",
                  fontSize: 9,
                  marginTop: 3,
                }}
              >
                {Math.max(stats.total - stats.completed, 0)} remaining
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ================================================
        STATS CARD
    ================================================= */}

      <View
        style={{
          paddingHorizontal: 16,
          marginTop: -10,
          zIndex: 5,
        }}
      >
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 18,

            padding: 8,

            shadowColor: "#0B3D2E",
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: 0.1,
            shadowRadius: 8,

            elevation: 5,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "stretch",
            }}
          >
            <StatBox
              label="Pending"
              value={stats.pending}
              color="#DC2626"
              bg="#FFF3F1"
              icon={AlertTriangle}
            />

            <StatBox
              label="Cleaning"
              value={stats.inProgress}
              color="#C28A08"
              bg="#FFF8E6"
              icon={Droplets}
            />

            <StatBox
              label="Done"
              value={stats.completed}
              color="#14966E"
              bg="#EAF8F2"
              icon={CheckCircle2}
            />

            <StatBox
              label="Damaged"
              value={stats.damaged}
              color="#7357C7"
              bg="#F3F0FB"
              icon={ShieldAlert}
            />
          </View>
        </View>
      </View>

      {/* ================================================
        ROOMS TO CLEAN
    ================================================= */}

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 17,
          paddingBottom: 9,

          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "800",
            color: "#0F172A",
            letterSpacing: -0.25,
          }}
        >
          Rooms to Clean
        </Text>

        <View
          style={{
            alignItems: "flex-end",
          }}
        >
          <TouchableOpacity
            onPress={() => setShowAll((prev) => !prev)}
            activeOpacity={0.6}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: "#14966E",
              }}
            >
              {showAll ? "Show Less" : "Show All"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
  /* =======================================================
   MAIN
======================================================= */

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F5F1E6",
      }}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0B3D2E"
        translucent={false}
      />
      <FlatList
        data={previewTasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <RoomPreviewCard item={item} />}
        ListHeaderComponent={<Header />}
        contentContainerStyle={{
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#14966E"]}
            tintColor="#14966E"
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <View
              style={{
                marginHorizontal: 20,
                backgroundColor: "#FFFFFF",
                borderRadius: 20,
                padding: 28,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  backgroundColor: "#EAF8F2",

                  alignItems: "center",
                  justifyContent: "center",

                  marginBottom: 12,
                }}
              >
                <CheckCircle2 size={29} color="#14966E" strokeWidth={1.7} />
              </View>

              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: "#111827",
                }}
              >
                All Clear!
              </Text>

              <Text
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                  textAlign: "center",
                  marginTop: 5,
                }}
              >
                No rooms need ongoing right now. Great work!
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          <>
            {/* =================================================
                ATTENTION REQUIRED
            ================================================= */}

            {attentionTasks.length > 0 && (
              <View
                style={{
                  marginTop: 5,
                  marginBottom: 18,
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 20,
                    marginBottom: 10,

                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <AlertTriangle size={19} color="#DC2626" strokeWidth={2} />

                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "800",
                      color: "#111827",
                      marginLeft: 8,
                    }}
                  >
                    Attention Required
                  </Text>
                </View>

                {attentionTasks.slice(0, 2).map((item: any) => (
                  <TouchableOpacity
                    key={`attention-${item.id}`}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({
                        pathname: "/tasks",
                        params: {
                          roomId: item.id,
                        },
                      })
                    }
                    style={{
                      marginHorizontal: 20,
                      marginBottom: 10,
                      padding: 13,
                      borderRadius: 18,

                      backgroundColor: "#FFF1F0",
                      borderWidth: 1,
                      borderColor: "#F4C7C3",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius: 13,
                          overflow: "hidden",
                          backgroundColor: "#FFE2DF",
                        }}
                      >
                        {item.image_url ? (
                          <Image
                            source={{
                              uri: item.image_url,
                            }}
                            style={{
                              width: "100%",
                              height: "100%",
                            }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={{
                              flex: 1,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Wrench size={20} color="#DC2626" />
                          </View>
                        )}
                      </View>

                      <View
                        style={{
                          flex: 1,
                          marginLeft: 11,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: "800",
                            color: "#111827",
                          }}
                        >
                          Room {item.room_number}
                        </Text>

                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: "#DC2626",
                            marginTop: 2,
                          }}
                        >
                          Damage reported
                        </Text>

                        <Text
                          style={{
                            fontSize: 10,
                            color: "#64748b",
                            marginTop: 2,
                          }}
                        >
                          Needs maintenance review
                        </Text>
                      </View>

                      <View
                        style={{
                          backgroundColor: "#FFE2DF",
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: 14,

                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: "#DC2626",
                            marginRight: 3,
                          }}
                        >
                          View
                        </Text>

                        <ArrowRight size={11} color="#DC2626" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* =================================================
                MOTIVATIONAL CARD
            ================================================= */}

            <View
              style={{
                marginHorizontal: 20,
                marginTop: 3,
                marginBottom: 8,
                borderRadius: 15,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={["#0B3D2E", "#145A43"]}
                start={{
                  x: 0,
                  y: 0,
                }}
                end={{
                  x: 1,
                  y: 1,
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 11,

                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,

                    backgroundColor: "#17634A",

                    alignItems: "center",
                    justifyContent: "center",

                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.18)",
                  }}
                >
                  <Leaf size={19} color="#FFFFFF" strokeWidth={1.8} />
                </View>

                <View
                  style={{
                    flex: 1,
                    marginLeft: 10,
                    minWidth: 0,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      color: "#FFFFFF",
                    }}
                  >
                    Keep up the great work!
                  </Text>

                  <Text
                    style={{
                      fontSize: 8,
                      color: "rgba(255,255,255,0.72)",
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    Clean spaces create happier experiences.
                  </Text>
                </View>

                <ArrowRight
                  size={14}
                  color="rgba(255,255,255,0.78)"
                  strokeWidth={2}
                />
              </LinearGradient>
            </View>

            {/* LOADING */}

            {loading && (
              <ActivityIndicator
                size="large"
                color="#14966E"
                style={{
                  marginTop: 20,
                }}
              />
            )}
          </>
        }
      />
      <Modal
        visible={selectedRoomImages.length > 0}
        transparent
        animationType="fade"
        onRequestClose={closeRoomGallery}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.92)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* CLOSE */}

          <TouchableOpacity
            onPress={closeRoomGallery}
            style={{
              position: "absolute",
              top: 50,
              right: 18,
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* COUNTER */}

          <View
            style={{
              position: "absolute",
              top: 58,
              left: 18,
              backgroundColor: "rgba(255,255,255,0.15)",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 12,
              zIndex: 10,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 11,
                fontWeight: "700",
              }}
            >
              {selectedRoomImageIndex + 1} / {selectedRoomImages.length}
            </Text>
          </View>

          {/* MAIN IMAGE */}

          {selectedRoomImages[selectedRoomImageIndex] && (
            <Image
              source={{
                uri: selectedRoomImages[selectedRoomImageIndex],
              }}
              style={{
                width: "90%",
                height: 470,
              }}
              resizeMode="contain"
            />
          )}

          {/* PREVIOUS */}

          {selectedRoomImages.length > 1 && (
            <TouchableOpacity
              onPress={showPreviousRoomImage}
              style={{
                position: "absolute",
                left: 15,
                top: "50%",
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: "rgba(255,255,255,0.16)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft size={27} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* NEXT */}

          {selectedRoomImages.length > 1 && (
            <TouchableOpacity
              onPress={showNextRoomImage}
              style={{
                position: "absolute",
                right: 15,
                top: "50%",
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: "rgba(255,255,255,0.16)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronRight size={27} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* THUMBNAILS */}

          {selectedRoomImages.length > 1 && (
            <FlatList
              horizontal
              data={selectedRoomImages}
              keyExtractor={(uri, index) => `${uri}-${index}`}
              showsHorizontalScrollIndicator={false}
              style={{
                position: "absolute",
                bottom: 30,
                width: "100%",
              }}
              contentContainerStyle={{
                paddingHorizontal: 15,
              }}
              renderItem={({ item: uri, index }) => (
                <TouchableOpacity
                  onPress={() => setSelectedRoomImageIndex(index)}
                  style={{
                    width: 55,
                    height: 55,
                    borderRadius: 8,
                    overflow: "hidden",
                    marginHorizontal: 4,
                    borderWidth: index === selectedRoomImageIndex ? 2 : 1,
                    borderColor:
                      index === selectedRoomImageIndex
                        ? "#C9A227"
                        : "rgba(255,255,255,0.3)",
                  }}
                >
                  <Image
                    source={{ uri }}
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

/* =========================================================
   STAT BOX
========================================================= */

const StatBox = ({ label, value, color, bg, icon: Icon }: any) => (
  <View
    style={{
      width: "23%",
      backgroundColor: bg,
      borderRadius: 13,
      paddingVertical: 9,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Icon size={18} color={color} strokeWidth={1.8} />

    <Text
      style={{
        fontSize: 19,
        fontWeight: "800",
        color: color,
        marginTop: 3,
      }}
    >
      {value}
    </Text>

    <Text
      style={{
        fontSize: 8,
        color: "#94a3b8",
        fontWeight: "600",
        textAlign: "center",
        marginTop: 2,
        width: "100%",
      }}
    >
      {label}
    </Text>
  </View>
);
