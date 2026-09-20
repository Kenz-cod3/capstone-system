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

type FilterKey = "all" | "dirty" | "cleaning" | "maintenance";

/*
|--------------------------------------------------------------------------
| STATUS META
|--------------------------------------------------------------------------
| You can adjust the height of EACH status here.
|
| Dirty       = 165
| Cleaning    = 165
| Maintenance = 165
|
| If you want Dirty smaller:
|
| dirty: {
|   ...
|   height: 150,
| }
|--------------------------------------------------------------------------
*/

const STATUS_META: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    height: number;
  }
> = {
  dirty: {
    label: "Dirty",
    color: "#ef4444",
    bg: "#fee2e2",
    height: 165,
  },

  cleaning: {
    label: "Cleaning",
    color: "#f59e0b",
    bg: "#fef3c7",
    height: 165,
  },

  maintenance: {
    label: "Maintenance",
    color: "#8b5cf6",
    bg: "#ede9fe",
    height: 165,
  },
};

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [processingId, setProcessingId] = useState<number | null>(null);

  const [preview, setPreview] = useState<string | null>(null);

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

      const res = await api.get("/housekeeper/tasks");

      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];

      const activeTasks = data.filter(
        (t: any) =>
          t.status === "dirty" ||
          t.status === "cleaning" ||
          t.status === "maintenance",
      );

      setTasks(activeTasks);
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
    }, []),
  );

  // =========================================================
  // PULL TO REFRESH
  // =========================================================

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    getTasks(true);
  }, []);

  // =========================================================
  // FILTER COUNTS
  // =========================================================

  const counts = useMemo(() => {
    return {
      all: tasks.length,

      dirty: tasks.filter((t) => t.status === "dirty").length,

      cleaning: tasks.filter((t) => t.status === "cleaning").length,

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
      key: "dirty",
      label: "Dirty",
    },
    {
      key: "cleaning",
      label: "Cleaning",
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
  // START CLEANING
  // =========================================================

  const markInProgress = async (id: number, currentStatus: string) => {
    if (currentStatus !== "dirty") {
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

      // Found item is NOT damage
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

      // Remove from current list immediately
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

    const meta = STATUS_META[item.status] ?? STATUS_META.dirty;

    /*
    |--------------------------------------------------------------------------
    | THIS IS THE IMPORTANT PART
    |--------------------------------------------------------------------------
    | The card height now comes from STATUS_META.
    |
    | Dirty       -> meta.height
    | Cleaning    -> meta.height
    | Maintenance -> meta.height
    |--------------------------------------------------------------------------
    */

    const cardHeight = meta.height;

    const photoCount = item.images?.length ?? item.photos?.length ?? 0;

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
      item.status === "dirty"
        ? "Needs cleaning"
        : item.status === "cleaning"
          ? "In progress"
          : "Awaiting repair";

    // =======================================================
    // CARD
    // =======================================================

    return (
      <View
        className="bg-white mb-4 rounded-2xl overflow-hidden"
        style={{
          width: "100%",

          /*
          |--------------------------------------------------------------------------
          | CARD HEIGHT
          |--------------------------------------------------------------------------
          */

          height: cardHeight,
          minHeight: cardHeight,
          maxHeight: cardHeight,

          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 10,

          shadowOffset: {
            width: 0,
            height: 3,
          },

          elevation: 2,
        }}
      >
        {/* ================================================= */}
        {/* CARD ROW */}
        {/* ================================================= */}

        <View
          className="flex-row"
          style={{
            width: "100%",

            height: cardHeight,
            minHeight: cardHeight,
            maxHeight: cardHeight,
          }}
        >
          {/* ================================================= */}
          {/* LEFT IMAGE */}
          {/* ================================================= */}

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={!item.image_url}
            onPress={() => item.image_url && setPreview(item.image_url)}
            style={{
              width: "42%",

              height: cardHeight,
              minHeight: cardHeight,
              maxHeight: cardHeight,
            }}
          >
            <View
              style={{
                width: "100%",

                height: cardHeight,
                minHeight: cardHeight,
                maxHeight: cardHeight,
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
                  className="bg-gray-100 items-center justify-center"
                  style={{
                    width: "100%",
                    height: cardHeight,
                  }}
                >
                  <Feather name="image" size={25} color="#9ca3af" />

                  <Text className="text-gray-400 text-[10px] mt-1">
                    No image
                  </Text>
                </View>
              )}

              {/* STATUS BADGE */}

              <View
                className="absolute top-3 left-3 flex-row items-center px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: "rgba(255,255,255,0.95)",
                }}
              >
                <View
                  className="w-2 h-2 rounded-full mr-1.5"
                  style={{
                    backgroundColor: meta.color,
                  }}
                />

                <Text
                  className="text-[10px] font-bold"
                  style={{
                    color: meta.color,
                  }}
                >
                  {meta.label}
                </Text>
              </View>

              {/* PHOTO COUNT */}

              {photoCount > 0 && (
                <View className="absolute bottom-3 left-3 flex-row items-center bg-black/60 px-2 py-1 rounded-lg">
                  <Feather name="image" size={11} color="#fff" />

                  <Text className="text-white text-[10px] font-semibold ml-1">
                    {photoCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* ================================================= */}
          {/* RIGHT CONTENT */}
          {/* ================================================= */}

          <View
            className="flex-1 p-5 justify-center"
            style={{
              height: cardHeight,
              minHeight: cardHeight,
              maxHeight: cardHeight,

              /*
              |--------------------------------------------------------------------------
              | IMPORTANT
              |--------------------------------------------------------------------------
              | Prevent content from stretching the card.
              |--------------------------------------------------------------------------
              */

              overflow: "hidden",
            }}
          >
            {/* ROOM NUMBER */}

            <Text className="font-bold text-lg text-gray-900" numberOfLines={1}>
              Room {item.room_number}
            </Text>

            {/* ROOM TYPE */}

            <Text
              className="text-[11px] text-gray-400 mb-2.5"
              numberOfLines={1}
            >
              {item.room_type || "Standard Room"}
            </Text>

            {/* GUEST / BED INFO */}

            {(item.guests != null || item.beds != null) && (
              <View className="flex-row items-center mb-2">
                {item.guests != null && (
                  <View className="flex-row items-center mr-3">
                    <Feather name="users" size={13} color="#9ca3af" />

                    <Text className="text-gray-500 text-[11px] ml-1">
                      {item.guests} Guests
                    </Text>
                  </View>
                )}

                {item.beds != null && (
                  <View className="flex-row items-center">
                    <MaterialCommunityIcons
                      name="bed-outline"
                      size={15}
                      color="#9ca3af"
                    />

                    <Text className="text-gray-500 text-[11px] ml-1">
                      {item.beds} {item.beds === 1 ? "Bed" : "Beds"}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* DIVIDER */}

            <View className="h-px bg-gray-100 mb-1.5" />

            {/* STATUS */}

            <View className="flex-row items-center mb-2">
              <Feather
                name={item.status === "maintenance" ? "tool" : "clock"}
                size={13}
                color="#9ca3af"
              />

              <Text className="text-gray-400 text-[11px] ml-1.5">
                {statusText}
              </Text>
            </View>

            {/* ================================================= */}
            {/* DIRTY */}
            {/* ================================================= */}

            {item.status === "dirty" && (
              <TouchableOpacity
                disabled={isProcessing}
                onPress={() => markInProgress(item.id, item.status)}
                className="self-start flex-row items-center justify-center bg-yellow-500 px-3.5 py-2 rounded-xl"
              >
                <Feather name="play" size={12} color="#fff" />

                <Text className="text-white font-semibold text-[11px] ml-1.5">
                  {isProcessing ? "Starting..." : "Start Cleaning"}
                </Text>
              </TouchableOpacity>
            )}

            {/* ================================================= */}
            {/* CLEANING */}
            {/* ================================================= */}

            {item.status === "cleaning" && (
              <>
                {/* REPORT BUTTON */}

                <TouchableOpacity
                  disabled={isProcessing}
                  onPress={() => setReportModalVisible(true)}
                  className={`self-start px-3 py-2 rounded-xl mb-2 ${
                    hasDamage
                      ? isFound
                        ? "bg-blue-100"
                        : "bg-red-100"
                      : "bg-gray-100"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-semibold ${
                      hasDamage
                        ? isFound
                          ? "text-blue-700"
                          : "text-red-600"
                        : "text-gray-600"
                    }`}
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

                <View className="flex-row items-center gap-2">
                  <View className="flex-1 bg-yellow-50 px-2 py-2 rounded-xl items-center justify-center">
                    <Text className="text-yellow-700 font-semibold text-[10px]">
                      🧹 In Progress
                    </Text>
                  </View>

                  <TouchableOpacity
                    disabled={isProcessing || (hasDamage && !note.trim())}
                    onPress={() =>
                      markDone(item.id, hasDamage, reportType, note, photos)
                    }
                    className={`flex-1 px-2 py-2 rounded-xl items-center justify-center ${
                      isProcessing || (hasDamage && !note.trim())
                        ? "bg-gray-300"
                        : "bg-green-500"
                    }`}
                  >
                    <Text className="text-white font-semibold text-[10px]">
                      {isProcessing ? "Processing..." : "✓ Done"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* HINT */}

                {hasDamage && !note.trim() && (
                  <Text className="text-[9px] text-red-400 mt-2 text-center">
                    Please describe the {reportType} item.
                  </Text>
                )}
              </>
            )}

            {/* ================================================= */}
            {/* MAINTENANCE */}
            {/* ================================================= */}

            {item.status === "maintenance" && (
              <View className="bg-purple-50 px-3 py-2 rounded-xl border border-purple-100">
                <Text className="text-purple-600 text-[10px] font-medium text-center">
                  🛠️ Under maintenance
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ===================================================== */}
        {/* REPORT ISSUE MODAL */}
        {/* ===================================================== */}

        <Modal
          visible={reportModalVisible}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setReportModalVisible(false)}
        >
          <KeyboardAvoidingView
            className="flex-1"
            behavior="position"
            keyboardVerticalOffset={0}
            contentContainerStyle={{
              flex: 1,
              justifyContent: "flex-end",
            }}
          >
            <View className="flex-1 bg-black/40 justify-end">
              <View
                className="bg-white rounded-t-3xl px-5 pt-5 pb-7"
                style={{
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

                  <View className="flex-row items-center justify-between mb-5">
                    <View>
                      <Text className="text-xl font-bold text-gray-900">
                        Report Issue
                      </Text>

                      <Text className="text-xs text-gray-400 mt-1">
                        Room {item.room_number}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => setReportModalVisible(false)}
                      className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
                    >
                      <Feather name="x" size={18} color="#6b7280" />
                    </TouchableOpacity>
                  </View>

                  {/* REPORT TYPE */}

                  <Text className="text-[10px] font-bold text-gray-500 mb-2 uppercase">
                    Report Type
                  </Text>

                  <View className="flex-row gap-2 mb-4">
                    {(["damaged", "lost", "found"] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setReportType(type)}
                        className={`flex-1 py-2.5 rounded-xl border ${
                          reportType === type
                            ? type === "found"
                              ? "bg-blue-500 border-blue-500"
                              : "bg-red-500 border-red-500"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <Text
                          className={`text-center text-xs font-medium capitalize ${
                            reportType === type ? "text-white" : "text-gray-600"
                          }`}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* FOUND INFO */}

                  {reportType === "found" && (
                    <View className="bg-blue-50 p-3 rounded-xl mb-4 border border-blue-100">
                      <Text className="text-blue-700 text-[10px]">
                        Found item should be surrendered to the admin/front
                        desk.
                      </Text>
                    </View>
                  )}

                  {/* DESCRIPTION */}

                  <Text className="text-[10px] font-bold text-gray-500 mb-1 uppercase">
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
                    className="border border-gray-200 bg-gray-50 p-3 rounded-xl text-sm mb-4"
                    placeholderTextColor="#9ca3af"
                  />

                  {/* PHOTOS */}

                  <Text className="text-[10px] font-bold text-gray-500 mb-2 uppercase">
                    Photos (optional)
                  </Text>

                  <View className="flex-row flex-wrap gap-2 mb-5">
                    {photos.map((uri, index) => (
                      <View key={index} className="relative">
                        <TouchableOpacity onPress={() => setPreview(uri)}>
                          <Image
                            source={{ uri }}
                            className="w-16 h-16 rounded-xl"
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => removePhoto(index)}
                          className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center"
                        >
                          <Text className="text-white text-[9px] font-bold">
                            ✕
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}

                    {photos.length < 5 && (
                      <TouchableOpacity
                        onPress={addPhoto}
                        className="w-16 h-16 rounded-xl border border-dashed border-gray-300 items-center justify-center bg-gray-50"
                      >
                        <Feather name="camera" size={20} color="#9ca3af" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* BUTTONS */}

                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => setReportModalVisible(false)}
                      className="flex-1 bg-gray-100 py-3.5 rounded-xl items-center"
                    >
                      <Text className="text-gray-600 font-semibold text-sm">
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={!note.trim()}
                      onPress={() => {
                        setHasDamage(true);
                        setReportModalVisible(false);
                      }}
                      className={`flex-1 py-3.5 rounded-xl items-center ${
                        !note.trim() ? "bg-gray-300" : "bg-red-500"
                      }`}
                    >
                      <Text className="text-white font-semibold text-sm">
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
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      {/* ===================================================== */}
      {/* HEADER */}
      {/* ===================================================== */}

      <View className="px-5 pt-2 pb-3">
        <View className="flex-row items-center mb-1">
          <Text className="text-2xl font-bold text-gray-900">
            Cleaning Tasks
          </Text>
        </View>

        <Text className="text-gray-400 text-sm">
          Keep our rooms clean and comfortable
        </Text>
      </View>

      {/* ===================================================== */}
      {/* SEARCH */}
      {/* ===================================================== */}

      <View className="px-5 mb-2">
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-gray-100">
          <Feather name="search" size={18} color="#9ca3af" />

          <TextInput
            placeholder="Search room number or type..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 ml-2 text-sm text-gray-700"
            placeholderTextColor="#9ca3af"
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x-circle" size={17} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ===================================================== */}
      {/* FILTER TABS */}
      {/* ===================================================== */}

      <View
        style={{
          height: 46,
          marginBottom: 10,
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

                  backgroundColor: active ? "#d1fae5" : "#ffffff",

                  borderWidth: 1,

                  borderColor: active ? "#d1fae5" : "#eef2f7",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,

                    fontWeight: active ? "600" : "500",

                    color: active ? "#047857" : "#64748b",

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

                    backgroundColor: active ? "#10b981" : "#f1f5f9",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: "700",

                      color: active ? "#ffffff" : "#64748b",
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

      {/* ===================================================== */}
      {/* CONTENT */}
      {/* ===================================================== */}

      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />

          <Text className="text-gray-400 text-xs mt-3">
            Loading cleaning tasks...
          </Text>
        </View>
      ) : visibleTasks.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="w-16 h-16 rounded-full bg-emerald-50 items-center justify-center mb-3">
            <Feather name="check-circle" size={28} color="#10b981" />
          </View>

          <Text className="text-gray-500 text-sm font-medium text-center">
            {tasks.length === 0
              ? "No tasks assigned."
              : "No tasks match your search."}
          </Text>

          {tasks.length === 0 && (
            <Text className="text-gray-400 text-xs text-center mt-1">
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
              colors={["#10b981"]}
              tintColor="#10b981"
              title="Pull to refresh"
              titleColor="#10b981"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ===================================================== */}
      {/* PHOTO PREVIEW */}
      {/* ===================================================== */}

      <Modal visible={!!preview} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 bg-black/90 justify-center items-center"
          activeOpacity={1}
          onPress={() => setPreview(null)}
        >
          {preview && (
            <Image
              source={{
                uri: preview,
              }}
              className="w-full h-96"
              resizeMode="contain"
            />
          )}

          <Text className="text-white/50 text-xs mt-4">Tap to close</Text>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
