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
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import api from "@/services/api";
import * as ImagePicker from "expo-image-picker";

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const getTasks = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await api.get("/housekeeper/tasks");
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];

      const activeTasks = data.filter(
        (t: any) => t.status === "dirty" || t.status === "cleaning"
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

  useFocusEffect(
    useCallback(() => {
      getTasks();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    getTasks(true);
  }, []);

  // CAMERA
  const takePhoto = async (setPhoto: (uri: string) => void) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Camera permission is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  // MARK IN PROGRESS
  const markInProgress = async (id: number, currentStatus: string) => {
    // Guard: only call API if still dirty, otherwise just sync UI
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

  // Helper: convert a URI to a File/Blob that works on both native and web
  const uriToFile = async (uri: string, name: string): Promise<any> => {
    // Web: fetch the blob URI and convert to File
    if (uri.startsWith("blob:") || uri.startsWith("data:")) {
      const res = await fetch(uri);
      const blob = await res.blob();
      return new File([blob], name, { type: "image/jpeg" });
    }
    // Native: use the RN object format
    return { uri, name, type: "image/jpeg" };
  };

  // MARK DONE — "found" report type does NOT count as damage → room stays available
  const markDone = async (
    roomId: number,
    hasDamage: boolean,
    reportType: "damaged" | "lost" | "found",
    note: string,
    photos: string[]
  ) => {
    try {
      setProcessingId(roomId);

      // "found" is NOT damage — room should go available, not maintenance
      const isActualDamage = hasDamage && reportType !== "found";

      // 1️⃣ COMPLETE THE CLEANING TASK
      const completeForm = new FormData();
      completeForm.append("has_damage", isActualDamage ? "1" : "0");
      await api.post(`/housekeeper/tasks/${roomId}/complete`, completeForm, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // 2️⃣ IF MAY REPORT (damage/lost/found) → CREATE INCIDENT REPORT
      if (hasDamage && note.trim()) {
        const reportForm = new FormData();
        reportForm.append("room_id", roomId.toString());
        reportForm.append("report_type", reportType);
        reportForm.append("note", note);

        // Convert each URI to a proper File/Blob (handles web blob: URIs + native file paths)
        await Promise.all(
          photos.map(async (uri, index) => {
            const file = await uriToFile(uri, `damage_${index}.jpg`);
            reportForm.append(`photos[${index}]`, file);
          })
        );

        await api.post("/housekeeper/incidents", reportForm, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setTasks((prev) =>
        prev.filter((task) => task.id !== roomId)
      );

      // Fetch fresh tasks from server
      await getTasks(true);

    } catch (e: any) {
      console.log("markDone error:", e?.response?.data || e);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  // TASK CARD
  const TaskCard = ({ item }: any) => {
    const isDone = item.status === "available";
    const isProcessing = processingId === item.id;

    const [hasDamage, setHasDamage] = useState(false);
    const [reportType, setReportType] = useState<"damaged" | "lost" | "found">("damaged");
    const [note, setNote] = useState("");
    const [photos, setPhotos] = useState<string[]>([]);

    // "found" only needs a note + photos, not a damage flag on the room
    const isFound = hasDamage && reportType === "found";

    const addPhoto = async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Camera permission is required.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
      if (!result.canceled) {
        setPhotos((prev) => [...prev, result.assets[0].uri]);
      }
    };

    const removePhoto = (index: number) => {
      setPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    return (
      <View className="bg-white p-5 mb-4 rounded-2xl shadow">
        {/* ROOM NUMBER + STATUS */}
        <Text className="font-bold text-xl mb-1">Room {item.room_number}</Text>
        <Text className="mb-3 text-gray-400 capitalize">{item.status}</Text>

        {!isDone && (
          <>
            {/* DIRTY = START BUTTON ONLY */}
            {item.status === "dirty" ? (

              <TouchableOpacity
                disabled={isProcessing}
                onPress={() => markInProgress(item.id, item.status)}
                className="bg-yellow-500 p-3 rounded-xl"
              >
                <Text className="text-white text-center font-semibold">
                  {isProcessing ? "Starting..." : "Start"}
                </Text>
              </TouchableOpacity>

            ) : (

              <>
                {/* REPORT TOGGLE */}
                <TouchableOpacity
                  disabled={isProcessing}
                  onPress={() => setHasDamage(!hasDamage)}
                  className={`p-3 rounded-xl mb-3 ${hasDamage
                    ? isFound
                      ? "bg-blue-500"
                      : "bg-red-500"
                    : "bg-gray-200"
                    }`}
                >
                  <Text className={`text-center font-semibold ${hasDamage ? "text-white" : "text-gray-600"}`}>
                    {hasDamage
                      ? isFound
                        ? "📦 Found Item"
                        : "⚠️ Damage Reported"
                      : "No Report"}
                  </Text>
                </TouchableOpacity>

                {/* REPORT FORM */}
                {hasDamage && (
                  <View className={`p-3 rounded-xl mb-3 border ${isFound
                    ? "bg-blue-50 border-blue-100"
                    : "bg-red-50 border-red-100"
                    }`}>

                    {/* REPORT TYPE */}
                    <Text className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                      Report Type
                    </Text>

                    <View className="flex-row gap-2 mb-3">
                      {(["damaged", "lost", "found"] as const).map((type) => (
                        <TouchableOpacity
                          key={type}
                          onPress={() => setReportType(type)}
                          className={`flex-1 p-2 rounded-lg border ${reportType === type
                            ? type === "found"
                              ? "bg-blue-500 border-blue-500"
                              : "bg-red-500 border-red-500"
                            : "bg-white border-gray-200"
                            }`}
                        >
                          <Text
                            className={`text-center text-xs font-medium capitalize ${reportType === type ? "text-white" : "text-gray-600"
                              }`}
                          >
                            {type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* FOUND INFO */}
                    {isFound && (
                      <View className="bg-blue-100 p-2 rounded-lg mb-3">
                        <Text className="text-blue-700 text-xs font-medium">
                          ℹ️ Found item should be surrendered to the admin/front desk for proper claiming and documentation.
                        </Text>
                      </View>
                    )}

                    {/* NOTE */}
                    <Text className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                      Description *
                    </Text>

                    <TextInput
                      placeholder={
                        isFound
                          ? "Describe the found item..."
                          : "Describe the damage/lost item..."
                      }
                      value={note}
                      onChangeText={setNote}
                      multiline
                      numberOfLines={3}
                      className="border border-gray-200 bg-white p-3 mb-3 rounded-xl text-sm"
                      placeholderTextColor="#9ca3af"
                    />

                    {/* PHOTOS */}
                    <Text className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                      Photos (optional)
                    </Text>

                    <View className="flex-row flex-wrap gap-2 mb-2">

                      {photos.map((uri, index) => (
                        <View key={index} className="relative">

                          <TouchableOpacity onPress={() => setPreview(uri)}>
                            <Image
                              source={{ uri }}
                              className="w-20 h-20 rounded-lg"
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => removePhoto(index)}
                            className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center"
                          >
                            <Text className="text-white text-xs font-bold">✕</Text>
                          </TouchableOpacity>

                        </View>
                      ))}

                      {photos.length < 5 && (
                        <TouchableOpacity
                          onPress={addPhoto}
                          className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 items-center justify-center bg-white"
                        >
                          <Text className="text-gray-400 text-2xl">+</Text>
                        </TouchableOpacity>
                      )}

                    </View>
                  </View>
                )}

                {/* CLEANING ACTIONS */}
                <View className="flex-row gap-2">

                  <View className="flex-1 bg-yellow-100 p-3 rounded-xl items-center justify-center">
                    <Text className="text-yellow-700 font-semibold text-center">
                      🧹 In Progress
                    </Text>
                  </View>

                  <TouchableOpacity
                    disabled={isProcessing || (hasDamage && !note.trim())}
                    onPress={() =>
                      markDone(item.id, hasDamage, reportType, note, photos)
                    }
                    className={`flex-1 p-3 rounded-xl ${isProcessing || (hasDamage && !note.trim())
                      ? "bg-gray-300"
                      : "bg-green-500"
                      }`}
                  >
                    <Text className="text-white text-center font-semibold">
                      {isProcessing ? "Processing..." : "Done"}
                    </Text>
                  </TouchableOpacity>

                </View>

                {/* HINT */}
                {hasDamage && !note.trim() && (
                  <Text className="text-xs text-red-400 mt-2 text-center">
                    Please describe the {reportType} item before marking as done.
                  </Text>
                )}

              </>
            )}
          </>
        )}

        {/* DONE — show report summary if any */}
        {isDone && item.damage_summary && (
          <View className={`mt-2 p-3 rounded-xl border ${item.damage_summary.report_type === "found"
            ? "bg-blue-50 border-blue-100"
            : "bg-orange-50 border-orange-100"
            }`}>
            <Text className={`text-xs font-semibold uppercase mb-1 ${item.damage_summary.report_type === "found"
              ? "text-blue-600"
              : "text-orange-600"
              }`}>
              {item.damage_summary.report_type} Report
            </Text>
            <Text className="text-sm text-gray-700">{item.damage_summary.note}</Text>

            {item.damage_summary.photos?.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mt-2">
                {item.damage_summary.photos.map((uri: string, i: number) => (
                  <TouchableOpacity key={i} onPress={() => setPreview(uri)}>
                    <Image
                      source={{ uri }}
                      className="w-16 h-16 rounded-lg"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <View className="px-5 pt-2 pb-1">
        <Text className="text-2xl font-bold text-gray-800">Cleaning Tasks</Text>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#10b981" className="mt-10" />
      ) : tasks.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400 text-base">No tasks assigned.</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <TaskCard item={item} />}
          contentContainerStyle={{ padding: 20 }}
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

      {/* PHOTO PREVIEW MODAL */}
      <Modal visible={!!preview} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 bg-black/90 justify-center items-center"
          activeOpacity={1}
          onPress={() => setPreview(null)}
        >
          {preview && (
            <Image
              source={{ uri: preview }}
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