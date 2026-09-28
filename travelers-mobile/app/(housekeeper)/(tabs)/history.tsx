import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
  Pressable,
} from "react-native";

import { useEffect, useState, useRef } from "react";
import api from "../../../services/api";

import DateTimePicker from "@react-native-community/datetimepicker";

import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Home,
  DoorOpen,
  ClipboardCheck,
  Brush,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Wrench,
  CircleCheck,
  CircleAlert,
  X,
  ChevronDown,
} from "lucide-react-native";

import { useScrollToTop } from "@react-navigation/native";

/* =========================================================
   HISTORY ITEM
========================================================= */

interface HistoryItem {
  id: number;
  room_number?: string;
  status?: string;
  has_damage?: boolean;
  room_type?: string;

  damage_summary?: {
    report_type?: string;
    note?: string;
    status?: string;
  } | null;

  completed_at?: string;
  changed_at?: string;

  user?: {
    first_name?: string;
    last_name?: string;
  };

  booking?: {
    booking_reference?: string;
    rooms?: {
      room_number?: string;
    }[];
  };
}

/* =========================================================
   COLORS
========================================================= */

const COLORS = {
  primary: "#0B3D2E",
  primaryDark: "#063C2E",
  emerald: "#14966E",
  emeraldDark: "#0B8060",
  emeraldLight: "#EAF8F2",

  cream: "#F5F1E6",
  card: "#FFFDF7",
  white: "#FFFFFF",

  text: "#17211D",
  textMuted: "#66716B",
  textLight: "#7B8580",

  gold: "#C9A227",

  red: "#DC2626",
  redLight: "#FFF1F1",

  blue: "#2874C6",
  blueLight: "#EEF5FB",

  border: "#E6E1D5",
};

/* =========================================================
   HISTORY SCREEN
========================================================= */

export default function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(
    null,
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const flatListRef = useRef<any>(null);

  useScrollToTop(flatListRef);

  /* =======================================================
     FILTER STATE
  ======================================================= */

  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const [filterType, setFilterType] = useState<
    "today" | "week" | "month" | "year" | "custom"
  >("month");

  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  /* =======================================================
     GET HISTORY
  ======================================================= */

  const getHistory = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }

      const res = await api.get("/housekeeper/history?per_page=all");

      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];

      setHistory(data);
    } catch (error: any) {
      console.log("❌ History Error:", error?.response?.data || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* =======================================================
     REFRESH
  ======================================================= */

  const onRefresh = () => {
    setRefreshing(true);
    getHistory(true);
  };

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    getHistory();
  }, []);

  /* =======================================================
     FORMAT DATE
  ======================================================= */

  const formatDate = (dateStr?: string) => {
    if (!dateStr) {
      return {
        date: "No date",
        time: "",
      };
    }

    const d = new Date(dateStr);

    return {
      date: d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),

      time: d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  /* =======================================================
     DATE HELPERS
  ======================================================= */

  const getDateOnly = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  /* =======================================================
     START OF WEEK
  ======================================================= */

  const getStartOfWeek = (date: Date) => {
    const result = new Date(date);

    const day = result.getDay();

    const diff = day === 0 ? -6 : 1 - day;

    result.setDate(result.getDate() + diff);

    result.setHours(0, 0, 0, 0);

    return result;
  };

  /* =======================================================
     END OF WEEK
  ======================================================= */

  const getEndOfWeek = (date: Date) => {
    const result = getStartOfWeek(date);

    result.setDate(result.getDate() + 6);

    result.setHours(23, 59, 59, 999);

    return result;
  };

  /* =======================================================
     GET FILTER RANGE
  ======================================================= */

  const getFilterRange = () => {
    const now = new Date();

    let start: Date;
    let end: Date;

    switch (filterType) {
      case "today":
        start = new Date(now);
        start.setHours(0, 0, 0, 0);

        end = new Date(now);
        end.setHours(23, 59, 59, 999);

        break;

      case "week":
        start = getStartOfWeek(now);
        end = getEndOfWeek(now);

        break;

      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);

        end = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );

        break;

      case "year":
        start = new Date(now.getFullYear(), 0, 1);

        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

        break;

      case "custom":
        start = getDateOnly(fromDate);
        start.setHours(0, 0, 0, 0);

        end = getDateOnly(toDate);
        end.setHours(23, 59, 59, 999);

        break;

      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);

        end = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );
    }

    return {
      start,
      end,
    };
  };

  /* =======================================================
     FILTERED HISTORY
  ======================================================= */

  const filteredHistory = history.filter((item) => {
    const dateValue = item.completed_at || item.changed_at;

    if (!dateValue) {
      return false;
    }

    const itemDate = new Date(dateValue);

    const { start, end } = getFilterRange();

    return itemDate >= start && itemDate <= end;
  });

  const visibleHistory = showAll
    ? filteredHistory
    : filteredHistory.slice(0, 5);

  /* =======================================================
     DATE CATEGORY
  ======================================================= */

  const getDateCategory = (dateStr?: string) => {
    if (!dateStr) {
      return {
        label: "OTHER",
        dateLabel: "No date",
        key: "no-date",
        timestamp: 0,
      };
    }

    const date = new Date(dateStr);

    const today = getDateOnly(new Date());

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const itemDate = getDateOnly(date);

    let label = "";

    if (itemDate.getTime() === today.getTime()) {
      label = "TODAY";
    } else if (itemDate.getTime() === yesterday.getTime()) {
      label = "YESTERDAY";
    } else {
      label = date
        .toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
        .toUpperCase();
    }

    return {
      label,

      dateLabel: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),

      key: `${itemDate.getFullYear()}-${itemDate.getMonth()}-${itemDate.getDate()}`,

      timestamp: itemDate.getTime(),
    };
  };

  /* =======================================================
     GROUP HISTORY BY DATE
  ======================================================= */

  const dateGroups = new Map<
    string,
    {
      label: string;
      dateLabel: string;
      timestamp: number;
      items: HistoryItem[];
    }
  >();

  visibleHistory.forEach((item) => {
    const dateValue = item.completed_at || item.changed_at;

    const category = getDateCategory(dateValue);

    if (!dateGroups.has(category.key)) {
      dateGroups.set(category.key, {
        label: category.label,
        dateLabel: category.dateLabel,
        timestamp: category.timestamp,
        items: [],
      });
    }

    dateGroups.get(category.key)?.items.push(item);
  });

  /* =======================================================
     GROUPED FLATLIST DATA
  ======================================================= */

  const groupedList: any[] = [];

  Array.from(dateGroups.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .forEach((group) => {
      groupedList.push({
        type: "header",
        key: `header-${group.timestamp}`,
        label: group.label,
        dateLabel: group.dateLabel,
      });

      group.items.forEach((item) => {
        groupedList.push({
          type: "item",
          key: `item-${item.id}`,
          data: item,
        });
      });
    });

  /* =======================================================
     SUMMARY
  ======================================================= */

  const totalDone = filteredHistory.length;

  /*
   * Only unresolved damage is counted as "Had Damage".
   *
   * If a damage report is already resolved,
   * the room is treated as cleaned in the summary.
   */
  const totalDamaged = filteredHistory.filter((h) => {
    // Count every history record that has a damage report,
    // including reports that have already been resolved.
    return h.has_damage === true || h.damage_summary != null;
  }).length;

  const cleanRate =
    totalDone > 0
      ? Math.round(((totalDone - totalDamaged) / totalDone) * 100)
      : 0;

  /* =======================================================
     FILTER LABEL
  ======================================================= */

  const getFilterLabel = () => {
    switch (filterType) {
      case "today":
        return "Today";

      case "week":
        return "This Week";

      case "month":
        return "This Month";

      case "year":
        return "This Year";

      case "custom":
        return `${fromDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} - ${toDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`;

      default:
        return "This Month";
    }
  };

  /* =======================================================
     STATUS BAR
  ======================================================= */

  const statusBarStyle = "light-content";

  /* =======================================================
     DAMAGE STATUS
  ======================================================= */

  const getDamageStatusConfig = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "resolved":
        return {
          icon: CheckCircle2,
          color: COLORS.emerald,
          bg: "#DDF3E7",
        };

      case "pending":
        return {
          icon: Clock,
          color: COLORS.gold,
          bg: "#FBF2D6",
        };

      case "in_progress":
        return {
          icon: Wrench,
          color: "#7357C7",
          bg: "#EEEAF8",
        };

      default:
        return {
          icon: AlertTriangle,
          color: COLORS.red,
          bg: "#FCE8E8",
        };
    }
  };

  /* =======================================================
     SCROLL
  ======================================================= */

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    setIsScrolled(offsetY > 160);
  };

  /* =======================================================
     HEADER
  ======================================================= */

  const Header = () => (
    <>
      {/* =================================================
          HEADER
      ================================================= */}

      <View
        style={{
          backgroundColor: COLORS.primary,

          paddingTop: 50,
          paddingBottom: 50,
          paddingHorizontal: 24,

          borderBottomLeftRadius: 25,
          borderBottomRightRadius: 25,
        }}
      >
        {/* YOUR WORK */}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 7,
          }}
        >
          <ClipboardCheck
            size={20}
            color="rgba(255,255,255,0.82)"
            strokeWidth={1.8}
          />

          <Text
            style={{
              color: "rgba(255,255,255,0.78)",
              fontSize: 14,
              fontWeight: "600",
              marginLeft: 9,
            }}
          >
            Your Work
          </Text>
        </View>

        {/* TITLE */}

        <Text
          style={{
            color: COLORS.white,
            fontSize: 31,
            fontWeight: "800",
            letterSpacing: -0.9,
            lineHeight: 37,
          }}
        >
          Cleaning History
        </Text>

        {/* SUBTITLE */}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 7,
          }}
        >
          <Brush size={15} color="rgba(255,255,255,0.7)" strokeWidth={1.8} />

          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 12,
              fontWeight: "500",
              marginLeft: 7,
            }}
          >
            All completed ongoing tasks
          </Text>
        </View>
      </View>

      {/* =================================================
          SUMMARY CARD
      ================================================= */}

      <View
        style={{
          paddingHorizontal: 20,
          marginTop: -20,
          marginBottom: -5,
          zIndex: 5,
        }}
      >
        <View
          style={{
            backgroundColor: COLORS.card,
            borderRadius: 24,
            padding: 12,

            shadowColor: "#0B3D2E",
            shadowOffset: {
              width: 0,
              height: 5,
            },
            shadowOpacity: 0.1,
            shadowRadius: 12,

            elevation: 5,

            flexDirection: "row",
            gap: 8,
          }}
        >
          <SummaryBox
            label="Total Cleaned"
            value={totalDone}
            color={COLORS.emerald}
            bg="#EAF8F2"
            icon={CheckCircle2}
          />

          <SummaryBox
            label="Had Damage"
            value={totalDamaged}
            color={COLORS.red}
            bg="#FFF1F1"
            icon={AlertTriangle}
          />

          <SummaryBox
            label="Clean Rate"
            value={
              cleanRate === 100 && totalDone > 0 ? "Perfect!" : `${cleanRate}%`
            }
            color={COLORS.blue}
            bg={COLORS.blueLight}
            icon={TrendingUp}
          />
        </View>
      </View>

      {/* =================================================
          SECTION HEADER
      ================================================= */}

      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 18,
          paddingBottom: 13,

          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
          }}
        >
          <Text
            style={{
              fontSize: 19,
              fontWeight: "800",
              color: COLORS.text,
              marginLeft: 8,
              letterSpacing: -0.4,
              flexShrink: 1,
            }}
          >
            {totalDone} Completed Room
            {totalDone !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* FILTER */}

        <Pressable
          onPress={() => setFilterModalVisible(true)}
          style={{
            backgroundColor: "#E4F5ED",
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 18,
            flexDirection: "row",
            alignItems: "center",
            marginLeft: 8,
          }}
        >
          <Calendar size={14} color="#0B6B4F" strokeWidth={1.9} />

          <Text
            style={{
              fontSize: 11,
              color: "#0B6B4F",
              fontWeight: "800",
              marginLeft: 5,
            }}
          >
            {getFilterLabel()}
          </Text>

          <ChevronDown
            size={14}
            color="#0B6B4F"
            strokeWidth={2.3}
            style={{ marginLeft: 4 }}
          />
        </Pressable>
      </View>

      {/* SHOW ALL */}

      <View
        style={{
          alignItems: "flex-end",
          paddingHorizontal: 24,
          marginTop: -5,
          marginBottom: 8,
        }}
      >
        <Pressable
          onPress={() => setShowAll((prev) => !prev)}
          android_ripple={{
            color: "#EAF8F2",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: COLORS.emerald,
            }}
          >
            {showAll ? "Show Less" : "Show All"}
          </Text>
        </Pressable>
      </View>
    </>
  );

  /* =======================================================
     LOADING SCREEN
  ======================================================= */

  if (loading && !refreshing) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.cream,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.primary}
          translucent={false}
        />

        <ActivityIndicator size="large" color={COLORS.emerald} />

        <Text
          style={{
            marginTop: 10,
            color: COLORS.textLight,
            fontSize: 14,
            fontWeight: "500",
          }}
        >
          Loading history...
        </Text>
      </View>
    );
  }

  /* =======================================================
     MAIN
  ======================================================= */

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.cream,
      }}
    >
      {/* =================================================
          STATUS BAR
      ================================================= */}

      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={COLORS.primary}
        translucent={false}
      />

      {/* =================================================
          HISTORY LIST
      ================================================= */}

      <FlatList
        ref={flatListRef}
        data={groupedList}
        keyExtractor={(item, index) => item?.key || index.toString()}
        contentContainerStyle={{
          paddingBottom: 35,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<Header />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.emerald]}
            tintColor={COLORS.emerald}
          />
        }
        ListEmptyComponent={
          <View
            style={{
              alignItems: "center",
              paddingTop: 60,
              paddingHorizontal: 40,
            }}
          >
            <View
              style={{
                width: 82,
                height: 82,
                borderRadius: 41,
                backgroundColor: COLORS.emeraldLight,

                alignItems: "center",
                justifyContent: "center",

                marginBottom: 20,
              }}
            >
              <Sparkles size={40} color={COLORS.emerald} strokeWidth={1.5} />
            </View>

            <Text
              style={{
                fontSize: 22,
                fontWeight: "800",
                color: COLORS.text,
                textAlign: "center",
                letterSpacing: -0.5,
              }}
            >
              No History Yet
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: COLORS.textLight,
                textAlign: "center",
                marginTop: 8,
                lineHeight: 20,
              }}
            >
              No completed ongoing tasks were found for this period.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          /* =================================================
             DATE CATEGORY HEADER
          ================================================= */

          if (item.type === "header") {
            return (
              <View
                style={{
                  marginHorizontal: 24,
                  marginTop: 10,
                  marginBottom: 8,

                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                {/* DATE CATEGORY */}

                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "800",
                    color: COLORS.primary,
                    letterSpacing: 0.2,
                  }}
                >
                  {item.label}
                </Text>

                {/* DIVIDER */}

                <View
                  style={{
                    flex: 1,
                    height: 1.5,
                    backgroundColor: "#D2D9D4",
                    marginLeft: 9,
                    marginRight: 9,
                  }}
                />

                {/* DATE PILL */}

                <View
                  style={{
                    backgroundColor: "#E7F0EB",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 14,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "700",
                      color: "#64746D",
                    }}
                  >
                    {item.dateLabel}
                  </Text>
                </View>
              </View>
            );
          }

          /* =================================================
             HISTORY ITEM
          ================================================= */

          const historyItem: HistoryItem = item.data;

          /* ---------------------------------------------
             ROOM NUMBER
          --------------------------------------------- */

          const roomNumber =
            historyItem?.room_number ||
            historyItem?.booking?.rooms?.[0]?.room_number ||
            "N/A";

          /* ---------------------------------------------
             DATE
          --------------------------------------------- */

          const dateStr = historyItem?.completed_at || historyItem?.changed_at;

          const { date, time } = formatDate(dateStr);

          /* ---------------------------------------------
             DAMAGE
          --------------------------------------------- */

          const hasDamage = historyItem?.has_damage ?? false;

          const damageType = historyItem?.damage_summary?.report_type;

          const damageNote = historyItem?.damage_summary?.note;

          const damageStatus =
            historyItem?.damage_summary?.status?.toLowerCase() || "";

          /*
           * A resolved damage report should no longer make
           * the main history card appear as damaged.
           */
          const damageResolved = damageStatus === "resolved";

          /*
           * Only unresolved damage is considered active.
           */
          const hasActiveDamage = hasDamage && !damageResolved;

          const damageConfig = getDamageStatusConfig(damageStatus);

          /*
           * Keep the damage icon available even when the
           * damage has already been resolved so the report
           * can still display its status.
           */
          const DamageStatusIcon = hasDamage ? damageConfig.icon : null;

          const damageStatusColor = damageConfig.color;

          const damageStatusBg = damageConfig.bg;

          return (
            <View
              style={{
                marginHorizontal: 20,
                marginBottom: 8,
                backgroundColor: COLORS.white,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#E5EAE7",
                padding: 14,
              }}
            >
              {/* TOP ROW */}

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                {/* STATUS ICON */}

                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: hasActiveDamage ? "#FFF1F1" : "#EAF8F2",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  {hasActiveDamage ? (
                    <AlertTriangle
                      size={17}
                      color={COLORS.red}
                      strokeWidth={2}
                    />
                  ) : (
                    <CheckCircle2
                      size={18}
                      color={COLORS.emerald}
                      strokeWidth={2}
                    />
                  )}
                </View>

                {/* ROOM INFO */}

                <View
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "800",
                      color: COLORS.text,
                    }}
                    numberOfLines={1}
                  >
                    Room {roomNumber}
                  </Text>

                  {historyItem.room_type && (
                    <Text
                      style={{
                        fontSize: 10,
                        color: COLORS.textLight,
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {historyItem.room_type}
                    </Text>
                  )}
                </View>

                {/* STATUS */}

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginLeft: 8,
                  }}
                >
                  <CircleCheck
                    size={12}
                    color={COLORS.emerald}
                    strokeWidth={2}
                  />

                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "800",
                      color: COLORS.emeraldDark,
                      marginLeft: 4,
                    }}
                  >
                    {hasActiveDamage ? "Damage" : "Cleaned"}
                  </Text>
                </View>
              </View>

              {/* DATE */}

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 9,
                  marginLeft: 46,
                }}
              >
                <Calendar
                  size={12}
                  color={COLORS.textLight}
                  strokeWidth={1.8}
                />

                <Text
                  style={{
                    fontSize: 10,
                    color: COLORS.textLight,
                    marginLeft: 6,
                  }}
                >
                  {date}
                  {time ? ` • ${time}` : ""}
                </Text>
              </View>

              {/* DAMAGE — ONLY SHOW IF REPORTED */}

              {hasDamage && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 9,
                    marginLeft: 46,
                  }}
                >
                  <ShieldAlert
                    size={12}
                    color={damageResolved ? COLORS.emerald : COLORS.red}
                    strokeWidth={1.8}
                  />

                  <Text
                    style={{
                      fontSize: 10,
                      color: damageResolved ? COLORS.emeraldDark : COLORS.red,
                      fontWeight: "700",
                      marginLeft: 5,
                    }}
                  >
                    Damage reported
                    {damageResolved ? " • Resolved" : ""}
                  </Text>
                </View>
              )}

              {/* VIEW DETAILS */}

              <Pressable
                onPress={() => {
                  setSelectedHistory(historyItem);
                  setShowDetailsModal(true);
                }}
                style={{
                  marginTop: 10,
                  marginLeft: 46,
                  alignSelf: "flex-start",
                  paddingVertical: 5,
                  paddingHorizontal: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "800",
                    color: COLORS.emeraldDark,
                  }}
                >
                  View Details →
                </Text>
              </Pressable>
            </View>
          );
        }}
      />

      {/* =================================================
    VIEW DETAILS MODAL
================================================= */}

      <Modal
        visible={showDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowDetailsModal(false);
          setSelectedHistory(null);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.card,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 22,
              paddingBottom: 30,
              maxHeight: "88%",
            }}
          >
            {/* HEADER */}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 21,
                    fontWeight: "800",
                    color: COLORS.text,
                  }}
                >
                  Room {selectedHistory?.room_number || "N/A"}
                </Text>

                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.textLight,
                    marginTop: 4,
                  }}
                >
                  Cleaning history details
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  setShowDetailsModal(false);
                  setSelectedHistory(null);
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: COLORS.emeraldLight,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={20} color="#0B6B4F" />
              </Pressable>
            </View>

            {/* ROOM INFORMATION */}

            <Text
              style={{
                fontSize: 13,
                fontWeight: "800",
                color: COLORS.emeraldDark,
                marginBottom: 8,
              }}
            >
              Room Information
            </Text>

            <DetailRow
              label="Room Number"
              value={selectedHistory?.room_number || "N/A"}
            />

            <DetailRow
              label="Room Type"
              value={selectedHistory?.room_type || "N/A"}
            />

            {/* CLEANING DETAILS */}

            <Text
              style={{
                fontSize: 13,
                fontWeight: "800",
                color: COLORS.emeraldDark,
                marginTop: 18,
                marginBottom: 8,
              }}
            >
              Cleaning Details
            </Text>

            <DetailRow label="Status" value="Cleaned" />

            <DetailRow
              label="Completed"
              value={
                selectedHistory?.completed_at
                  ? `${formatDate(selectedHistory.completed_at).date}${
                      formatDate(selectedHistory.completed_at).time
                        ? ` at ${formatDate(selectedHistory.completed_at).time}`
                        : ""
                    }`
                  : "No date"
              }
            />

            {/* DAMAGE REPORT */}

            {selectedHistory?.has_damage && selectedHistory?.damage_summary && (
              <>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "800",
                    color: COLORS.emeraldDark,
                    marginTop: 18,
                    marginBottom: 8,
                  }}
                >
                  Damage Report
                </Text>

                <DetailRow label="Reported Damage" value="Yes" />

                <DetailRow
                  label="Type"
                  value={selectedHistory.damage_summary.report_type || "N/A"}
                />

                <DetailRow
                  label="Status"
                  value={
                    selectedHistory.damage_summary.status
                      ? selectedHistory.damage_summary.status
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (char) => char.toUpperCase())
                      : "N/A"
                  }
                />

                <DetailRow
                  label="Remarks"
                  value={selectedHistory.damage_summary.note || "No remarks"}
                />
              </>
            )}

            {/* NO DAMAGE */}

            {(!selectedHistory?.has_damage ||
              !selectedHistory?.damage_summary) && (
              <View
                style={{
                  marginTop: 18,
                  backgroundColor: COLORS.emeraldLight,
                  borderRadius: 13,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: "#CFE9DC",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <CheckCircle2
                    size={16}
                    color={COLORS.emerald}
                    strokeWidth={2}
                  />

                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: COLORS.emeraldDark,
                      marginLeft: 7,
                    }}
                  >
                    No damage was reported for this cleaning.
                  </Text>
                </View>
              </View>
            )}

            {/* CLOSE */}

            <Pressable
              onPress={() => {
                setShowDetailsModal(false);
                setSelectedHistory(null);
              }}
              style={{
                marginTop: 22,
                backgroundColor: COLORS.emeraldDark,
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: COLORS.white,
                  fontSize: 14,
                  fontWeight: "800",
                }}
              >
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* =================================================
          FILTER MODAL
      ================================================= */}

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.card,

              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,

              padding: 22,
              paddingBottom: 30,
            }}
          >
            {/* HEADER */}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 21,
                    fontWeight: "800",
                    color: COLORS.text,
                  }}
                >
                  Filter History
                </Text>

                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.textLight,
                    marginTop: 4,
                  }}
                >
                  Select the period you want to view
                </Text>
              </View>

              <Pressable
                onPress={() => setFilterModalVisible(false)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,

                  backgroundColor: COLORS.emeraldLight,

                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={20} color="#0B6B4F" />
              </Pressable>
            </View>

            {/* QUICK FILTERS */}

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 20,
              }}
            >
              {[
                {
                  key: "today",
                  label: "Today",
                },
                {
                  key: "week",
                  label: "This Week",
                },
                {
                  key: "month",
                  label: "This Month",
                },
                {
                  key: "year",
                  label: "This Year",
                },
                {
                  key: "custom",
                  label: "Custom",
                },
              ].map((option) => {
                const selected = filterType === option.key;

                return (
                  <Pressable
                    key={option.key}
                    onPress={() =>
                      setFilterType(
                        option.key as
                          | "today"
                          | "week"
                          | "month"
                          | "year"
                          | "custom",
                      )
                    }
                    style={{
                      backgroundColor: selected
                        ? COLORS.emeraldDark
                        : COLORS.emeraldLight,

                      paddingHorizontal: 14,
                      paddingVertical: 9,

                      borderRadius: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",

                        color: selected ? COLORS.white : "#0B6B4F",
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* CUSTOM DATE RANGE */}

            {filterType === "custom" && (
              <View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#374151",
                    marginBottom: 8,
                  }}
                >
                  Custom Date Range
                </Text>

                {/* FROM */}

                <Pressable
                  onPress={() => setShowFromPicker(true)}
                  style={{
                    backgroundColor: "#F8F5EC",
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 14,
                    padding: 13,
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      color: COLORS.textLight,
                      marginBottom: 3,
                      fontWeight: "700",
                    }}
                  >
                    FROM
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Calendar size={16} color={COLORS.emerald} />

                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: COLORS.text,
                        marginLeft: 8,
                      }}
                    >
                      {fromDate.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                </Pressable>

                {/* TO */}

                <Pressable
                  onPress={() => setShowToPicker(true)}
                  style={{
                    backgroundColor: "#F8F5EC",
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 14,
                    padding: 13,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      color: COLORS.textLight,
                      marginBottom: 3,
                      fontWeight: "700",
                    }}
                  >
                    TO
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Calendar size={16} color={COLORS.emerald} />

                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: COLORS.text,
                        marginLeft: 8,
                      }}
                    >
                      {toDate.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                </Pressable>

                {/* FROM DATE PICKER */}

                {showFromPicker && (
                  <DateTimePicker
                    value={fromDate}
                    mode="date"
                    display="calendar"
                    onChange={(event, date) => {
                      setShowFromPicker(false);

                      if (date) {
                        setFromDate(date);

                        if (date > toDate) {
                          setToDate(date);
                        }
                      }
                    }}
                  />
                )}

                {/* TO DATE PICKER */}

                {showToPicker && (
                  <DateTimePicker
                    value={toDate}
                    mode="date"
                    display="calendar"
                    minimumDate={fromDate}
                    onChange={(event, date) => {
                      setShowToPicker(false);

                      if (date) {
                        setToDate(date);
                      }
                    }}
                  />
                )}
              </View>
            )}

            {/* APPLY */}

            <Pressable
              onPress={() => setFilterModalVisible(false)}
              style={{
                marginTop: 20,

                backgroundColor: COLORS.emeraldDark,

                paddingVertical: 14,

                borderRadius: 16,

                alignItems: "center",

                shadowColor: COLORS.primary,

                shadowOffset: {
                  width: 0,
                  height: 3,
                },

                shadowOpacity: 0.15,
                shadowRadius: 5,
                elevation: 3,
              }}
            >
              <Text
                style={{
                  color: COLORS.white,
                  fontSize: 14,
                  fontWeight: "800",
                }}
              >
                Apply Filter
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =========================================================
   DETAIL ROW
========================================================= */

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View
    style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: "#F0EDE4",
    }}
  >
    <Text
      style={{
        fontSize: 12,
        color: COLORS.textLight,
        fontWeight: "500",
        flex: 0.8,
      }}
    >
      {label}
    </Text>

    <Text
      style={{
        fontSize: 12,
        color: COLORS.text,
        fontWeight: "700",
        textAlign: "right",
        flex: 1.2,
        marginLeft: 12,
      }}
    >
      {value}
    </Text>
  </View>
);
/* =========================================================
   SUMMARY BOX
========================================================= */

const SummaryBox = ({ label, value, color, bg, icon: Icon }: any) => (
  <View
    style={{
      flex: 1,

      backgroundColor: bg,

      borderRadius: 18,

      paddingVertical: 15,
      paddingHorizontal: 5,

      alignItems: "center",
      justifyContent: "center",

      minHeight: 112,
    }}
  >
    <Icon size={21} color={color} strokeWidth={1.9} />

    <Text
      style={{
        fontSize: 22,
        fontWeight: "800",
        color,

        marginTop: 5,

        letterSpacing: -0.5,
      }}
    >
      {value}
    </Text>

    <Text
      style={{
        fontSize: 10,
        color: "#718078",
        fontWeight: "600",

        textAlign: "center",

        marginTop: 3,

        includeFontPadding: false,
      }}
    >
      {label}
    </Text>
  </View>
);
