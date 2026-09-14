import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Image,
} from "react-native";

import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { LinearGradient } from "expo-linear-gradient";

import api from "@/services/api";
import { useAuthStore } from "@/store/authStore";

import {
  Sparkles,
  Clock,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
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

  const [tasks, setTasks] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    damaged: 0,
  });

  /* =======================================================
     FETCH TASKS + HISTORY
  ======================================================= */

  const getTasks = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }

      const [tasksRes, historyRes] = await Promise.all([
        api.get("/housekeeper/tasks"),
        api.get("/housekeeper/history"),
      ]);

      const data: any[] = Array.isArray(tasksRes.data)
        ? tasksRes.data
        : tasksRes.data?.data || [];

      const historyData: any[] = Array.isArray(historyRes.data)
        ? historyRes.data
        : historyRes.data?.data || [];

      /*
       * Active housekeeping tasks.
       *
       * Dashboard preview focuses on rooms that still
       * need attention.
       */
      const cleaningTasks = data.filter(
        (t: any) =>
          t.status === "dirty" ||
          t.status === "cleaning" ||
          t.status === "maintenance",
      );

      setTasks(cleaningTasks);
      setHistory(historyData);

      setStats({
        total: data.length + historyData.length,
        completed: historyData.length,
        pending: data.filter((t: any) => t.status === "dirty").length,
        inProgress: data.filter((t: any) => t.status === "cleaning").length,
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

      return undefined;
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
     GREETING
  ======================================================= */

  const greeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return {
        text: "Good morning",
        icon: Sun,
        color: "#fbbf24",
      };
    }

    if (hour < 17) {
      return {
        text: "Good afternoon",
        icon: CloudSun,
        color: "#f59e0b",
      };
    }

    return {
      text: "Good evening",
      icon: Moon,
      color: "#c4b5fd",
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

  /*
   * Show only a few rooms on the dashboard.
   * The Tasks screen contains the complete list.
   */
  const previewTasks = tasks.slice(0, 2);

  /* =======================================================
     ATTENTION REQUIRED
  ======================================================= */

  const attentionTasks = tasks.filter(
    (item: any) =>
      item.status === "maintenance" || item.has_damage || item.damage_summary,
  );

  /* =======================================================
     STATUS CONFIG
  ======================================================= */

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "cleaning":
        return {
          bg: "#fffbeb",
          border: "#fde68a",
          dot: "#f59e0b",
          badge: "#fef3c7",
          badgeText: "#92400e",
          label: "In Progress",
          color: "#f59e0b",
        };

      case "dirty":
        return {
          bg: "#fff1f2",
          border: "#fecdd3",
          dot: "#ef4444",
          badge: "#fee2e2",
          badgeText: "#991b1b",
          label: "Needs Cleaning",
          color: "#ef4444",
        };

      case "maintenance":
        return {
          bg: "#f5f3ff",
          border: "#ddd6fe",
          dot: "#8b5cf6",
          badge: "#ede9fe",
          badgeText: "#5b21b6",
          label: "Maintenance",
          color: "#8b5cf6",
        };

      default:
        return {
          bg: "#f9fafb",
          border: "#e5e7eb",
          dot: "#9ca3af",
          badge: "#f3f4f6",
          badgeText: "#374151",
          label: "Unknown",
          color: "#9ca3af",
        };
    }
  };

  /* =======================================================
     ROOM PREVIEW CARD
  ======================================================= */

  const RoomPreviewCard = ({ item }: { item: any }) => {
    const config = getStatusConfig(item.status);

    return (
      <TouchableOpacity
        activeOpacity={0.88}
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
          marginBottom: 14,
          backgroundColor: "#ffffff",
          borderRadius: 22,
          padding: 12,

          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.07,
          shadowRadius: 10,

          elevation: 3,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "stretch",
          }}
        >
          {/* =================================================
              ROOM IMAGE
          ================================================= */}

          <View
            style={{
              width: 118,
              height: 138,
              borderRadius: 16,
              overflow: "hidden",
              backgroundColor: "#f3f4f6",
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
                <Home size={28} color="#9ca3af" strokeWidth={1.5} />

                <Text
                  style={{
                    fontSize: 9,
                    color: "#9ca3af",
                    marginTop: 5,
                  }}
                >
                  No image
                </Text>
              </View>
            )}

            {/* PHOTO COUNT */}

            {(item.images?.length || item.photos?.length || item.image_count) >
              0 && (
              <View
                style={{
                  position: "absolute",
                  right: 7,
                  bottom: 7,
                  backgroundColor: "rgba(0,0,0,0.65)",
                  borderRadius: 8,
                  paddingHorizontal: 7,
                  paddingVertical: 4,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: "700",
                  }}
                >
                  📷{" "}
                  {item.images?.length ||
                    item.photos?.length ||
                    item.image_count}
                </Text>
              </View>
            )}
          </View>

          {/* =================================================
              RIGHT CONTENT
          ================================================= */}

          <View
            style={{
              flex: 1,
              paddingLeft: 12,
              paddingVertical: 2,
            }}
          >
            {/* STATUS */}

            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: config.badge,
                paddingHorizontal: 9,
                paddingVertical: 5,
                borderRadius: 20,
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: config.dot,
                  marginRight: 5,
                }}
              />

              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: config.badgeText,
                }}
              >
                {config.label}
              </Text>
            </View>

            {/* ROOM NUMBER */}

            <Text
              style={{
                fontSize: 19,
                fontWeight: "800",
                color: "#111827",
                letterSpacing: -0.4,
              }}
            >
              Room {item.room_number}
            </Text>

            {/* ROOM TYPE */}

            <Text
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginTop: 2,
                marginBottom: 8,
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
                  marginBottom: 7,
                }}
              >
                {item.guests != null && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <Users size={13} color="#94a3b8" />

                    <Text
                      style={{
                        fontSize: 10,
                        color: "#64748b",
                        marginLeft: 4,
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
                    <Bed size={13} color="#94a3b8" />

                    <Text
                      style={{
                        fontSize: 10,
                        color: "#64748b",
                        marginLeft: 4,
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
                backgroundColor: "#f1f5f9",
                marginBottom: 7,
              }}
            />

            {/* DAMAGE / NORMAL */}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              {item.damage_summary ? (
                <>
                  <ShieldAlert size={13} color="#dc2626" />

                  <Text
                    style={{
                      fontSize: 10,
                      color: "#dc2626",
                      fontWeight: "600",
                      marginLeft: 5,
                    }}
                    numberOfLines={1}
                  >
                    Damage reported
                  </Text>
                </>
              ) : (
                <>
                  <FileText size={13} color="#94a3b8" />

                  <Text
                    style={{
                      fontSize: 10,
                      color: "#94a3b8",
                      marginLeft: 5,
                    }}
                  >
                    No damage reported
                  </Text>
                </>
              )}
            </View>

            {/* OPEN BUTTON */}

            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: "#ecfdf5",
                paddingHorizontal: 13,
                paddingVertical: 7,
                borderRadius: 10,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: "#059669",
                  marginRight: 5,
                }}
              >
                Open
              </Text>

              <ArrowRight size={12} color="#059669" strokeWidth={2.5} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /* =======================================================
     HEADER
  ======================================================= */

  const Header = () => (
    <>
      {/* =================================================
          HERO
      ================================================= */}

      <LinearGradient
        colors={["#064e3b", "#047857", "#059669"]}
        start={{
          x: 0,
          y: 0,
        }}
        end={{
          x: 1,
          y: 1,
        }}
        style={{
          paddingTop: 55,
          paddingHorizontal: 20,
          paddingBottom: 80,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        {/* TOP ROW */}

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          {/* GREETING */}

          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 2,
              }}
            >
              <GreetingIcon
                size={18}
                color={greetingData.color}
                strokeWidth={1.8}
              />

              <Text
                style={{
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 12,
                  fontWeight: "500",
                  marginLeft: 7,
                }}
              >
                {greetingData.text},
              </Text>
            </View>

            <Text
              style={{
                color: "#ffffff",
                fontSize: 29,
                fontWeight: "800",
                letterSpacing: -0.8,
              }}
            >
              {firstName} 👋
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 5,
              }}
            >
              <Calendar size={12} color="rgba(255,255,255,0.55)" />

              <Text
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 11,
                  marginLeft: 6,
                }}
              >
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
          </View>

          {/* NOTIFICATION */}

          <TouchableOpacity
            activeOpacity={0.8}
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: "rgba(255,255,255,0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bell size={22} color="#ffffff" strokeWidth={1.8} />

            {/* NOTIFICATION DOT */}

            {(stats.damaged > 0 || stats.pending > 0) && (
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  right: 9,
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: "#ef4444",
                  borderWidth: 1.5,
                  borderColor: "#047857",
                }}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* =================================================
            PROGRESS CARD
        ================================================= */}

        <View
          style={{
            marginTop: 24,
            backgroundColor: "rgba(255,255,255,0.12)",
            borderRadius: 20,
            padding: 17,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.15)",
          }}
        >
          {/* TITLE */}

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <TrendingUp size={16} color="rgba(255,255,255,0.85)" />

              <Text
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 12,
                  fontWeight: "600",
                  marginLeft: 7,
                }}
              >
                Today's Progress
              </Text>
            </View>

            <Text
              style={{
                color: "#ffffff",
                fontSize: 23,
                fontWeight: "800",
              }}
            >
              {completionRate}%
            </Text>
          </View>

          {/* PROGRESS BAR */}

          <View
            style={{
              height: 7,
              backgroundColor: "rgba(255,255,255,0.15)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${completionRate}%`,
                backgroundColor: "#6ee7b7",
                borderRadius: 4,
              }}
            />
          </View>

          {/* PROGRESS INFO */}

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 9,
            }}
          >
            <Text
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 10,
              }}
            >
              {stats.completed} of {stats.total} rooms completed
            </Text>

            <Text
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 10,
              }}
            >
              {Math.max(stats.total - stats.completed, 0)} remaining
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* =================================================
          STATS
      ================================================= */}

      <View
        style={{
          paddingHorizontal: 20,
          marginTop: -25,
        }}
      >
        <View
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 22,
            padding: 12,

            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 7,
            },
            shadowOpacity: 0.08,
            shadowRadius: 14,

            elevation: 5,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              gap: 7,
            }}
          >
            <StatBox
              label="Pending"
              value={stats.pending}
              color="#ef4444"
              bg="#fff1f2"
              icon={AlertTriangle}
            />

            <StatBox
              label="Cleaning"
              value={stats.inProgress}
              color="#f59e0b"
              bg="#fffbeb"
              icon={Droplets}
            />

            <StatBox
              label="Done"
              value={stats.completed}
              color="#10b981"
              bg="#ecfdf5"
              icon={CheckCircle2}
            />

            <StatBox
              label="Damaged"
              value={stats.damaged}
              color="#8b5cf6"
              bg="#f5f3ff"
              icon={ShieldAlert}
            />
          </View>
        </View>
      </View>

      {/* =================================================
          ROOMS TO CLEAN HEADER
      ================================================= */}

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 23,
          paddingBottom: 11,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 21,
              fontWeight: "800",
              color: "#111827",
              letterSpacing: -0.4,
            }}
          >
            Rooms to Clean
          </Text>

          <Text
            style={{
              fontSize: 12,
              color: "#9ca3af",
              marginTop: 2,
            }}
          >
            {tasks.length} room
            {tasks.length !== 1 ? "s" : ""} remaining
          </Text>
        </View>

        {/* VIEW ALL */}

        {tasks.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/tasks")}
            style={{
              backgroundColor: "#ecfdf5",
              paddingHorizontal: 13,
              paddingVertical: 8,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: "#059669",
                marginRight: 5,
              }}
            >
              View All
            </Text>

            <ArrowRight size={13} color="#059669" strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  /* =======================================================
     MAIN
  ======================================================= */

  return (
    <SafeAreaView
      edges={["top"]}
      style={{
        flex: 1,
        backgroundColor: "#f8fafc",
      }}
    >
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <FlatList
        data={previewTasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <RoomPreviewCard item={item} />}
        ListHeaderComponent={<Header />}
        contentContainerStyle={{
          paddingBottom: 30,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#10b981"]}
            tintColor="#10b981"
          />
        }
        ListEmptyComponent={
          loading ? null : (
            <View
              style={{
                marginHorizontal: 20,
                backgroundColor: "#ffffff",
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
                  backgroundColor: "#ecfdf5",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <CheckCircle2 size={29} color="#10b981" strokeWidth={1.7} />
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
                No rooms need cleaning right now. Great work!
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
                {/* SECTION TITLE */}

                <View
                  style={{
                    paddingHorizontal: 20,
                    marginBottom: 10,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <AlertTriangle size={19} color="#ef4444" strokeWidth={2} />

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

                {/* ATTENTION CARDS */}

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
                      backgroundColor: "#fff1f2",
                      borderWidth: 1,
                      borderColor: "#fecdd3",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      {/* SMALL IMAGE */}

                      <View
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius: 13,
                          overflow: "hidden",
                          backgroundColor: "#fee2e2",
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
                            <Wrench size={20} color="#ef4444" />
                          </View>
                        )}
                      </View>

                      {/* CONTENT */}

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
                            color: "#ef4444",
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

                      {/* VIEW */}

                      <View
                        style={{
                          backgroundColor: "#fee2e2",
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
                            color: "#dc2626",
                            marginRight: 3,
                          }}
                        >
                          View
                        </Text>

                        <ArrowRight size={11} color="#dc2626" />
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
                marginTop: 4,
                marginBottom: 10,
                borderRadius: 20,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={["#ecfdf5", "#d1fae5"]}
                start={{
                  x: 0,
                  y: 0,
                }}
                end={{
                  x: 1,
                  y: 1,
                }}
                style={{
                  padding: 17,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                {/* ICON */}

                <View
                  style={{
                    width: 45,
                    height: 45,
                    borderRadius: 23,
                    backgroundColor: "#10b981",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Leaf size={23} color="#ffffff" strokeWidth={2} />
                </View>

                {/* TEXT */}

                <View
                  style={{
                    flex: 1,
                    marginLeft: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "800",
                      color: "#065f46",
                    }}
                  >
                    Keep up the great work!
                  </Text>

                  <Text
                    style={{
                      fontSize: 10,
                      color: "#047857",
                      marginTop: 3,
                    }}
                  >
                    Clean spaces create happier experiences.
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* LOADING */}

            {loading && (
              <ActivityIndicator
                size="large"
                color="#10b981"
                style={{
                  marginTop: 20,
                }}
              />
            )}
          </>
        }
      />
    </SafeAreaView>
  );
}

/* =========================================================
   STAT BOX
========================================================= */

const StatBox = ({ label, value, color, bg, icon: Icon }: any) => (
  <View
    style={{
      flex: 1,
      backgroundColor: bg,
      borderRadius: 16,
      paddingVertical: 11,
      paddingHorizontal: 4,
      alignItems: "center",
    }}
  >
    <Icon size={19} color={color} strokeWidth={1.8} />

    <Text
      style={{
        fontSize: 21,
        fontWeight: "800",
        color: color,
        marginTop: 3,
      }}
    >
      {value}
    </Text>

    <Text
      style={{
        fontSize: 9,
        color: "#94a3b8",
        fontWeight: "600",
        textAlign: "center",
        marginTop: 1,
      }}
      numberOfLines={1}
    >
      {label}
    </Text>
  </View>
);
