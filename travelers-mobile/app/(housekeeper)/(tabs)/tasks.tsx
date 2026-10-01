import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  ScrollView,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback, useMemo } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import api from "@/services/api";

import * as ImagePicker from "expo-image-picker";
type FilterKey = "all" | "preparing" | "ongoing" | "maintenance";

const STATUS_META: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    height: number;
  }
> = {
  preparing: {
    label: "Need Clean",
    color: "#DC2626",
    bg: "#FFF0EE",
    height: 130,
  },

  ongoing: {
    label: "Start Cleaning",
    color: "#C9A227",
    bg: "#FBF2D6",
    height: 165,
  },

  maintenance: {
    label: "Maintenance",
    color: "#7058B8",
    bg: "#EEEAF8",
    height: 130,
  },
};

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const [processingId, setProcessingId] = useState<number | null>(null);

  const [preview, setPreview] = useState<string | null>(null);

  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedFilter, setSelectedFilter] = useState<FilterKey>("all");

  // =========================================================
  // GET TASKS
  // =========================================================

  const getTasks = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }

      const res = await api.get(
        showAll
          ? "/housekeeper/tasks?per_page=all"
          : "/housekeeper/tasks?per_page=5",
      );

      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];

      const activeTasks = data.filter(
        (t: any) =>
          t.status === "preparing" ||
          t.status === "ongoing" ||
          t.status === "maintenance",
      );

      const tasksWithRoomImages = await Promise.all(
        activeTasks.map(async (task: any) => {
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

            const roomImages =
              normalImages.length > 0
                ? normalImages
                : room.image_url
                  ? [room.image_url]
                  : task.image_url
                    ? [task.image_url]
                    : [];

            return {
              ...task,

              // MAIN IMAGE = first Admin image
              image_url: roomImages[0] || null,

              // ALL ADMIN NORMAL IMAGES
              room_images: roomImages,

              // 360 kept separate
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

      // =========================================================
      // ORDER CLEANING TASKS
      // OLDEST UPDATED FIRST → NEWEST UPDATED LAST
      // =========================================================

      const orderedTasks = [...tasksWithRoomImages].sort((a: any, b: any) => {
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;

        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;

        return dateA - dateB;
      });

      setTasks(orderedTasks);
    } catch (error) {
      console.log(error);

      Alert.alert("Error", "Failed to fetch tasks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =========================================================
  // REFRESH WHEN SCREEN FOCUSED
  // =========================================================

  useFocusEffect(
    useCallback(() => {
      getTasks();

      return undefined;
    }, [showAll]),
  );

  // =========================================================
  // PULL TO REFRESH
  // =========================================================

  const onRefresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);

    try {
      await getTasks(true);
    } catch (error) {
      console.log("Pull refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, showAll]);
  // =========================================================
  // FILTER COUNTS
  // =========================================================

  const counts = useMemo(() => {
    return {
      all: tasks.length,

      preparing: tasks.filter((t) => t.status === "preparing").length,

      ongoing: tasks.filter((t) => t.status === "ongoing").length,

      maintenance: tasks.filter((t) => t.status === "maintenance").length,
    };
  }, [tasks]);

  // =========================================================
  // FILTERS
  // =========================================================

  const filters: {
    key: FilterKey;
    label: string;
  }[] = [
    {
      key: "all",
      label: "All",
    },
    {
      key: "preparing",
      label: "Need Clean",
    },
    {
      key: "ongoing",
      label: "Start Cleaning",
    },
    {
      key: "maintenance",
      label: "Maintenance",
    },
  ];

  // =========================================================
  // SEARCH + FILTER
  // =========================================================

  const visibleTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return tasks.filter((t) => {
      const matchesFilter =
        selectedFilter === "all" || t.status === selectedFilter;

      const matchesSearch =
        !q ||
        String(t.room_number ?? "")
          .toLowerCase()
          .includes(q) ||
        String(t.room_type ?? "")
          .toLowerCase()
          .includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [tasks, selectedFilter, searchQuery]);

  // =========================================================
  // CAMERA FILE
  // =========================================================

  const uriToFile = async (uri: string, name: string): Promise<any> => {
    if (uri.startsWith("blob:") || uri.startsWith("data:")) {
      const res = await fetch(uri);
      const blob = await res.blob();

      return new File([blob], name, {
        type: "image/jpeg",
      });
    }

    return {
      uri,
      name,
      type: "image/jpeg",
    };
  };

  // =========================================================
  // ROOM IMAGE GALLERY
  // =========================================================

  const openRoomGallery = (item: any) => {
    const images = Array.isArray(item.room_images)
      ? item.room_images.filter(Boolean)
      : item.image_url
        ? [item.image_url]
        : [];

    if (images.length === 0) {
      return;
    }

    setPreviewImages(images);
    setPreviewIndex(0);
    setPreview(images[0]);
  };

  const closeRoomGallery = () => {
    setPreview(null);
    setPreviewImages([]);
    setPreviewIndex(0);
  };

  const showPreviousRoomImage = () => {
    setPreviewIndex((currentIndex) => {
      if (previewImages.length <= 1) {
        return 0;
      }

      return currentIndex === 0 ? previewImages.length - 1 : currentIndex - 1;
    });
  };

  const showNextRoomImage = () => {
    setPreviewIndex((currentIndex) => {
      if (previewImages.length <= 1) {
        return 0;
      }

      return currentIndex === previewImages.length - 1 ? 0 : currentIndex + 1;
    });
  };

  // =========================================================
  // START CLEANING
  // =========================================================

  const markInProgress = async (id: number, currentStatus: string) => {
    if (currentStatus !== "preparing") {
      await getTasks(true);
      return;
    }

    try {
      setProcessingId(id);

      await api.post(`/housekeeper/tasks/${id}/start`);

      await getTasks(true);
    } catch (e: any) {
      console.log(e);

      const msg = e?.response?.data?.message || "Failed to start task";

      Alert.alert("Error", msg);

      await getTasks(true);
    } finally {
      setProcessingId(null);
    }
  };

  // =========================================================
  // COMPLETE CLEANING
  // =========================================================

  const markDone = async (
    roomId: number,
    hasDamage: boolean,
    reportType: "damaged" | "lost" | "found",
    note: string,
    photos: string[],
  ) => {
    try {
      setProcessingId(roomId);

      const isActualDamage = hasDamage && reportType !== "found";

      // -----------------------------------------------------
      // 1. COMPLETE CLEANING
      // -----------------------------------------------------

      const completeForm = new FormData();

      completeForm.append("has_damage", isActualDamage ? "1" : "0");

      await api.post(`/housekeeper/tasks/${roomId}/complete`, completeForm, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // -----------------------------------------------------
      // 2. INCIDENT REPORT
      // -----------------------------------------------------

      if (hasDamage && note.trim()) {
        const reportForm = new FormData();

        reportForm.append("room_id", roomId.toString());

        reportForm.append("report_type", reportType);

        reportForm.append("note", note);

        await Promise.all(
          photos.map(async (uri, index) => {
            const file = await uriToFile(uri, `damage_${index}.jpg`);

            reportForm.append(`photos[${index}]`, file);
          }),
        );

        await api.post("/housekeeper/incidents", reportForm, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      setTasks((prev) => prev.filter((task) => task.id !== roomId));

      await getTasks(true);
    } catch (e: any) {
      console.log("markDone error:", e?.response?.data || e);

      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  // =========================================================
  // TASK CARD
  // =========================================================

  const TaskCard = ({ item }: { item: any }) => {
    const isProcessing = processingId === item.id;

    const meta = STATUS_META[item.status] ?? STATUS_META.preparing;

    const cardHeight = meta.height;

    const photoCount = item.room_images?.length ?? 0;

    // =======================================================
    // REPORT STATES
    // =======================================================

    const [hasDamage, setHasDamage] = useState(false);

    const [reportModalVisible, setReportModalVisible] = useState(false);

    const [reportType, setReportType] = useState<"damaged" | "lost" | "found">(
      "damaged",
    );

    const [note, setNote] = useState("");

    const [photos, setPhotos] = useState<string[]>([]);

    const isFound = hasDamage && reportType === "found";

    // =======================================================
    // ADD PHOTO
    // =======================================================

    const addPhoto = async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission Required", "Camera permission is required.");

        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.5,
      });

      if (!result.canceled) {
        setPhotos((prev) => [...prev, result.assets[0].uri]);
      }
    };

    // =======================================================
    // REMOVE PHOTO
    // =======================================================

    const removePhoto = (index: number) => {
      setPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    // =======================================================
    // STATUS TEXT
    // =======================================================

    const statusText =
      item.status === "preparing"
        ? "Needs ongoing"
        : item.status === "ongoing"
          ? "In progress"
          : "Awaiting repair";

    // =======================================================
    // CARD
    // =======================================================

    return (
      <View
        style={{
          width: "100%",
          minHeight: cardHeight,

          marginBottom: 11,

          borderRadius: 16,

          backgroundColor: "#FFFDF7",

          borderWidth: 1,
          borderColor: "#E8E4D8",

          overflow: "visible",

          shadowColor: "#0B3D2E",
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: {
            width: 0,
            height: 3,
          },

          elevation: 2,
        }}
      >
        <View
          style={{
            width: "100%",
            height: cardHeight,

            flexDirection: "row",
          }}
        >
          {/* =================================================
              LEFT IMAGE
          ================================================= */}

          <View
            style={{
              width: "30%",
              height: cardHeight,
            }}
          >
            <View
              style={{
                width: "100%",
                height: cardHeight,

                backgroundColor: "#E8E4D8",
              }}
            >
              {item.image_url ? (
                <Image
                  source={{
                    uri: item.image_url,
                  }}
                  style={{
                    width: "100%",
                    height: cardHeight,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: "100%",
                    height: cardHeight,

                    alignItems: "center",
                    justifyContent: "center",

                    backgroundColor: "#EEEAE0",
                  }}
                >
                  <Feather name="image" size={25} color="#9CA39E" />

                  <Text
                    style={{
                      color: "#9CA39E",
                      fontSize: 10,
                      marginTop: 4,
                    }}
                  >
                    No image
                  </Text>
                </View>
              )}

              {/* STATUS BADGE */}

              <View
                style={{
                  position: "absolute",

                  top: 10,
                  left: 9,

                  flexDirection: "row",
                  alignItems: "center",

                  paddingHorizontal: 9,
                  paddingVertical: 5,

                  borderRadius: 20,

                  backgroundColor: "rgba(255,255,255,0.96)",
                }}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,

                    marginRight: 5,

                    backgroundColor: meta.color,
                  }}
                />

                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "800",
                    color: meta.color,
                  }}
                >
                  {meta.label}
                </Text>
              </View>
            </View>
          </View>

          {/* =================================================
              RIGHT CONTENT
          ================================================= */}

          <View
            style={{
              flex: 1,
              paddingHorizontal: 20,
              paddingVertical: 15,
              justifyContent: "flex-start",
              overflow: "visible",
            }}
          >
            {/* ROOM NUMBER */}

            <Text
              style={{
                fontFamily: "Georgia",
                fontSize: 17,
                fontWeight: "700",

                color: "#10251E",

                letterSpacing: -0.2,
              }}
            >
              Room {item.room_number}
            </Text>

            {/* ROOM TYPE */}

            <Text
              style={{
                fontSize: 10,
                color: "#7E8984",

                marginTop: 2,
                marginBottom: 7,
              }}
            >
              {item.room_type || "Standard Room"}
            </Text>

            {/* GUEST / BED INFO */}

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

                      marginRight: 10,
                    }}
                  >
                    <Feather name="users" size={12} color="#9CA39E" />

                    <Text
                      style={{
                        color: "#66736D",
                        fontSize: 9,
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
                    <MaterialCommunityIcons
                      name="bed-outline"
                      size={14}
                      color="#9CA39E"
                    />

                    <Text
                      style={{
                        color: "#66736D",
                        fontSize: 9,
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

                backgroundColor: "#ECE9E0",

                marginBottom: 7,
              }}
            />

            {/* STATUS */}

            {/* STATUS */}

            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                width: "100%",
                marginBottom: 7,
              }}
            >
              <Feather
                name={item.status === "maintenance" ? "tool" : "clock"}
                size={12}
                color="#9CA39E"
              />

              <Text
                ellipsizeMode="clip"
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 9,
                  color: "#7E8984",
                  marginLeft: 6,
                  lineHeight: 13,
                }}
              >
                {statusText}
              </Text>
            </View>

            {/* =================================================
                DIRTY
            ================================================= */}

            {item.status === "preparing" && (
              <TouchableOpacity
                disabled={isProcessing}
                onPress={() => markInProgress(item.id, item.status)}
                activeOpacity={0.85}
                style={{
                  alignSelf: "flex-start",

                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",

                  backgroundColor: "#C9A227",

                  paddingHorizontal: 13,
                  paddingVertical: 7,

                  borderRadius: 10,
                }}
              >
                <Feather name="play" size={11} color="#FFFFFF" />

                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 9,
                    fontWeight: "800",
                    marginLeft: 6,
                  }}
                >
                  {isProcessing ? "Starting..." : "Start Cleaning"}
                </Text>
              </TouchableOpacity>
            )}

            {/* =================================================
                CLEANING
            ================================================= */}

            {item.status === "ongoing" && (
              <>
                {/* REPORT BUTTON */}

                <TouchableOpacity
                  disabled={isProcessing}
                  onPress={() => setReportModalVisible(true)}
                  activeOpacity={0.85}
                  style={{
                    alignSelf: "flex-start",

                    paddingHorizontal: 10,
                    paddingVertical: 6,

                    borderRadius: 10,

                    marginBottom: 7,

                    backgroundColor: hasDamage
                      ? isFound
                        ? "#EAF2FF"
                        : "#FFF0EE"
                      : "#F0EEE7",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "700",

                      color: hasDamage
                        ? isFound
                          ? "#2563EB"
                          : "#DC2626"
                        : "#59655F",
                    }}
                  >
                    {hasDamage
                      ? isFound
                        ? "📦 Found Item"
                        : reportType === "lost"
                          ? "⚠️ Lost Item"
                          : "⚠️ Damage Reported"
                      : "🚩 Report Issue"}
                  </Text>
                </TouchableOpacity>

                {/* CLEANING ACTIONS */}

                <View
                  style={{
                    flexDirection: "row",

                    alignItems: "center",

                    gap: 7,
                  }}
                >
                  <View
                    style={{
                      flex: 1,

                      backgroundColor: "#FBF2D6",

                      paddingHorizontal: 7,
                      paddingVertical: 7,

                      borderRadius: 10,

                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#8B6B12",
                        fontSize: 8,
                        fontWeight: "800",
                      }}
                    >
                      🧹 In Progress
                    </Text>
                  </View>

                  <TouchableOpacity
                    disabled={isProcessing || (hasDamage && !note.trim())}
                    onPress={() =>
                      markDone(item.id, hasDamage, reportType, note, photos)
                    }
                    activeOpacity={0.85}
                    style={{
                      flex: 1,

                      paddingHorizontal: 7,
                      paddingVertical: 7,

                      borderRadius: 10,

                      alignItems: "center",
                      justifyContent: "center",

                      backgroundColor:
                        isProcessing || (hasDamage && !note.trim())
                          ? "#D1D5DB"
                          : "#14966E",
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 8,
                        fontWeight: "800",
                      }}
                    >
                      {isProcessing ? "Processing..." : "✓ Done"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* HINT */}

                {hasDamage && !note.trim() && (
                  <Text
                    style={{
                      fontSize: 8,
                      color: "#DC2626",
                      marginTop: 6,
                      textAlign: "center",
                    }}
                  >
                    Please describe the {reportType} item.
                  </Text>
                )}
              </>
            )}

            {/* =================================================
                MAINTENANCE
            ================================================= */}

            {item.status === "maintenance" && (
              <View
                style={{
                  backgroundColor: "#EEEAF8",

                  paddingHorizontal: 10,
                  paddingVertical: 7,

                  borderRadius: 10,

                  borderWidth: 1,
                  borderColor: "#DDD6F0",
                }}
              >
                <Text
                  style={{
                    color: "#7058B8",
                    fontSize: 9,
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                >
                  Under maintenance
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* =====================================================
            REPORT ISSUE MODAL
        ===================================================== */}

        <Modal
          visible={reportModalVisible}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setReportModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={{
              flex: 1,
            }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View
              style={{
                flex: 1,

                backgroundColor: "rgba(0,0,0,0.4)",

                justifyContent: "flex-end",
              }}
            >
              <View
                style={{
                  backgroundColor: "#FFFDF7",

                  borderTopLeftRadius: 28,
                  borderTopRightRadius: 28,

                  paddingHorizontal: 20,
                  paddingTop: 20,
                  paddingBottom: 28,

                  maxHeight: "90%",
                }}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{
                    paddingBottom: 4,
                  }}
                >
                  {/* HEADER */}

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",

                      marginBottom: 20,
                    }}
                  >
                    <View>
                      <Text
                        style={{
                          fontFamily: "Georgia",

                          fontSize: 20,
                          fontWeight: "700",

                          color: "#10251E",
                        }}
                      >
                        Report Issue
                      </Text>

                      <Text
                        style={{
                          fontSize: 11,
                          color: "#8A918D",
                          marginTop: 3,
                        }}
                      >
                        Room {item.room_number}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => setReportModalVisible(false)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,

                        backgroundColor: "#EEEAE0",

                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="x" size={17} color="#59655F" />
                    </TouchableOpacity>
                  </View>

                  {/* REPORT TYPE */}

                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "800",
                      color: "#59655F",

                      marginBottom: 8,

                      textTransform: "uppercase",
                    }}
                  >
                    Report Type
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      gap: 8,

                      marginBottom: 16,
                    }}
                  >
                    {(["damaged", "lost", "found"] as const).map((type) => {
                      const selected = reportType === type;

                      return (
                        <TouchableOpacity
                          key={type}
                          onPress={() => setReportType(type)}
                          style={{
                            flex: 1,

                            paddingVertical: 10,

                            borderRadius: 12,

                            borderWidth: 1,

                            borderColor: selected
                              ? type === "found"
                                ? "#2563EB"
                                : "#DC2626"
                              : "#E5E0D5",

                            backgroundColor: selected
                              ? type === "found"
                                ? "#2563EB"
                                : "#DC2626"
                              : "#FFFFFF",
                          }}
                        >
                          <Text
                            style={{
                              textAlign: "center",

                              fontSize: 11,
                              fontWeight: "700",

                              color: selected ? "#FFFFFF" : "#59655F",

                              textTransform: "capitalize",
                            }}
                          >
                            {type}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* FOUND INFO */}

                  {reportType === "found" && (
                    <View
                      style={{
                        backgroundColor: "#EAF2FF",

                        padding: 12,

                        borderRadius: 12,

                        marginBottom: 16,

                        borderWidth: 1,
                        borderColor: "#D6E5FF",
                      }}
                    >
                      <Text
                        style={{
                          color: "#2563EB",
                          fontSize: 10,
                          lineHeight: 15,
                        }}
                      >
                        Found item should be surrendered to the admin/front
                        desk.
                      </Text>
                    </View>
                  )}

                  {/* DESCRIPTION */}

                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "800",
                      color: "#59655F",

                      marginBottom: 6,

                      textTransform: "uppercase",
                    }}
                  >
                    Description *
                  </Text>

                  <TextInput
                    placeholder={
                      reportType === "found"
                        ? "Describe the found item..."
                        : reportType === "lost"
                          ? "Describe the lost item..."
                          : "Describe the damage..."
                    }
                    value={note}
                    onChangeText={setNote}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    style={{
                      borderWidth: 1,
                      borderColor: "#E5E0D5",
                      backgroundColor: "#F8F5EA",
                      padding: 12,
                      borderRadius: 12,
                      fontSize: 12,
                      color: "#26352F",
                      minHeight: 90,
                      marginBottom: 16,
                    }}
                    placeholderTextColor="#9CA39E"
                  />

                  {/* PHOTOS */}

                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "800",
                      color: "#59655F",
                      marginBottom: 8,
                      textTransform: "uppercase",
                    }}
                  >
                    Photos (optional)
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 20,
                    }}
                  >
                    {photos.map((uri, index) => (
                      <View
                        key={index}
                        style={{
                          position: "relative",
                        }}
                      >
                        <TouchableOpacity onPress={() => setPreview(uri)}>
                          <Image
                            source={{ uri }}
                            style={{
                              width: 64,
                              height: 64,
                              borderRadius: 12,
                            }}
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => removePhoto(index)}
                          style={{
                            position: "absolute",

                            top: -4,
                            right: -4,

                            backgroundColor: "#DC2626",

                            borderRadius: 10,

                            width: 20,
                            height: 20,

                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: "#FFFFFF",

                              fontSize: 9,
                              fontWeight: "800",
                            }}
                          >
                            ✕
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}

                    {photos.length < 5 && (
                      <TouchableOpacity
                        onPress={addPhoto}
                        style={{
                          width: 64,
                          height: 64,

                          borderRadius: 12,

                          borderWidth: 1,
                          borderStyle: "dashed",

                          borderColor: "#CFC9BC",

                          alignItems: "center",
                          justifyContent: "center",

                          backgroundColor: "#F8F5EA",
                        }}
                      >
                        <Feather name="camera" size={20} color="#8A918D" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* BUTTONS */}

                  <View
                    style={{
                      flexDirection: "row",
                      gap: 10,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => setReportModalVisible(false)}
                      style={{
                        flex: 1,

                        backgroundColor: "#EEEAE0",

                        paddingVertical: 13,

                        borderRadius: 12,

                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "#59655F",
                          fontWeight: "700",
                          fontSize: 12,
                        }}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={!note.trim()}
                      onPress={() => {
                        setHasDamage(true);
                        setReportModalVisible(false);
                      }}
                      style={{
                        flex: 1,

                        paddingVertical: 13,

                        borderRadius: 12,

                        alignItems: "center",

                        backgroundColor: !note.trim() ? "#D1D5DB" : "#0B3D2E",
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontWeight: "700",
                          fontSize: 12,
                        }}
                      >
                        Save Report
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  };

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F5F1E6",
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0B3D2E" />

      {/* =====================================================
          HEADER
      ===================================================== */}

      <View
        style={{
          backgroundColor: "#0B3D2E",

          paddingHorizontal: 25,
          paddingTop: 55,
          paddingBottom: 100,

          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <Text
          style={{
            fontSize: 30,
            fontWeight: "bold",
            color: "#F8F5EA",
            letterSpacing: -0.4,
          }}
        >
          Cleaning Tasks
        </Text>

        <Text
          style={{
            color: "rgba(245,241,230,0.72)",

            fontSize: 11,

            marginTop: 4,
          }}
        >
          Keep our rooms clean and comfortable.
        </Text>
      </View>

      {/* =====================================================
          SEARCH
      ===================================================== */}

      <View
        style={{
          marginHorizontal: 15,
          marginTop: -60,
          marginBottom: 15,
          zIndex: 5,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#FFFDF7",
            borderRadius: 15,
            paddingHorizontal: 13,
            height: 48,
            borderWidth: 1,
            borderColor: "#E8E4D8",
            shadowColor: "#0B3D2E",
            shadowOpacity: 0.05,
            shadowRadius: 7,

            shadowOffset: {
              width: 0,
              height: 2,
            },

            elevation: 2,
          }}
        >
          <Feather name="search" size={17} color="#52615B" />

          <TextInput
            placeholder="Search room number or type..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              flex: 1,

              marginLeft: 9,

              fontSize: 11,

              color: "#26352F",
            }}
            placeholderTextColor="#8A918D"
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x-circle" size={16} color="#8A918D" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* =====================================================
          FILTER TABS
      ===================================================== */}

      <View
        style={{
          height: 46,
          marginBottom: 5,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,

            alignItems: "center",

            gap: 8,
          }}
        >
          {filters.map((f) => {
            const active = selectedFilter === f.key;

            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setSelectedFilter(f.key)}
                activeOpacity={0.8}
                style={{
                  height: 38,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active ? "#0B3D2E" : "#FFFDF7",
                  borderWidth: 1,
                  borderColor: active ? "#0B3D2E" : "#E8E4D8",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: active ? "700" : "500",
                    color: active ? "#F8F5EA" : "#53615B",
                    marginRight: 6,
                  }}
                >
                  {f.label}
                </Text>

                <View
                  style={{
                    width: 17,
                    height: 17,
                    borderRadius: 9,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: active ? "#C9A227" : "#EEEAE0",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,

                      fontWeight: "700",

                      color: active ? "#0B3D2E" : "#68746F",
                    }}
                  >
                    {counts[f.key]}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* SHOW ALL / SHOW LESS */}
      <View
        style={{
          alignItems: "flex-end",
          paddingHorizontal: 20,
          marginTop: 0,
          marginBottom: 10,
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

      {/* =====================================================
          CONTENT
      ===================================================== */}

      {loading && !refreshing ? (
        <View
          style={{
            flex: 1,

            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color="#1F6E52" />

          <Text
            style={{
              color: "#8A918D",

              fontSize: 11,

              marginTop: 12,
            }}
          >
            Loading ongoing tasks...
          </Text>
        </View>
      ) : visibleTasks.length === 0 ? (
        <View
          style={{
            flex: 1,

            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
            backgroundColor: "#F5F1E6",
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "#EAF8F2",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Feather name="check-circle" size={28} color="#14966E" />
          </View>

          <Text
            style={{
              color: "#52615B",

              fontSize: 14,

              fontWeight: "600",

              textAlign: "center",
            }}
          >
            {tasks.length === 0
              ? "No tasks assigned."
              : "No tasks match your search."}
          </Text>

          {tasks.length === 0 && (
            <Text
              style={{
                color: "#8A918D",

                fontSize: 10,

                textAlign: "center",

                marginTop: 4,
              }}
            >
              All rooms are currently up to date.
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={visibleTasks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <TaskCard item={item} />}
          contentContainerStyle={{
            paddingHorizontal: 16,

            paddingTop: 0,

            paddingBottom: 20,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#14966E"]}
              tintColor="#14966E"
              title="Pull to refresh"
              titleColor="#14966E"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* =====================================================
          PHOTO PREVIEW
      ===================================================== */}

      <Modal
        visible={previewImages.length > 0}
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
            <Feather name="x" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* IMAGE COUNT */}

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
              {previewIndex + 1} / {previewImages.length}
            </Text>
          </View>

          {/* MAIN IMAGE */}

          {previewImages[previewIndex] && (
            <Image
              source={{
                uri: previewImages[previewIndex],
              }}
              style={{
                width: "90%",
                height: 470,
              }}
              resizeMode="contain"
            />
          )}

          {/* PREVIOUS */}

          {previewImages.length > 1 && (
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
              <Feather name="chevron-left" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* NEXT */}

          {previewImages.length > 1 && (
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
              <Feather name="chevron-right" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* THUMBNAILS */}

          {previewImages.length > 1 && (
            <FlatList
              horizontal
              data={previewImages}
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
                  onPress={() => {
                    setPreviewIndex(index);
                    setPreview(uri);
                  }}
                  style={{
                    width: 55,
                    height: 55,
                    borderRadius: 8,
                    overflow: "hidden",
                    marginHorizontal: 4,
                    borderWidth: index === previewIndex ? 2 : 1,
                    borderColor:
                      index === previewIndex
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
