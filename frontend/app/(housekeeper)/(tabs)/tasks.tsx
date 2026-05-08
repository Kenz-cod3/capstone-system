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
import { useEffect, useState } from "react";
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
      setTasks(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    getTasks();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    getTasks(true);
  };

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
  const markInProgress = async (id: number) => {
    try {
      setProcessingId(id);
      await api.post(`/housekeeper/tasks/${id}/start`);
      getTasks();
    } catch (e) {
      console.log(e);
    } finally {
      setProcessingId(null);
    }
  };

  // MARK DONE — complete the task first, then submit damage report separately
  const markDone = async (
    id: number,
    hasDamage: boolean,
    reportType: "damaged" | "lost" | "found",
    note: string,
    photos: string[]
  ) => {
    try {
      setProcessingId(id);

      // 1️⃣ COMPLETE THE CLEANING TASK
      const completeForm = new FormData();
      completeForm.append("has_damage", hasDamage ? "1" : "0");
      await api.post(`/housekeeper/tasks/${id}/complete`, completeForm, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // 2️⃣ IF MAY DAMAGE → CREATE DAMAGE REPORT
      if (hasDamage && note.trim()) {
        const reportForm = new FormData();
        reportForm.append("room_id", id.toString());
        reportForm.append("report_type", reportType);
        reportForm.append("note", note);

        photos.forEach((uri, index) => {
          reportForm.append(`photos[${index}]`, {
            uri,
            name: `damage_${index}.jpg`,
            type: "image/jpeg",
          } as any);
        });

        await api.post("/housekeeper/damage-reports", reportForm, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      getTasks();
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
            {/* DAMAGE TOGGLE */}
            <TouchableOpacity
              disabled={isProcessing}
              onPress={() => setHasDamage(!hasDamage)}
              className={`p-3 rounded-xl mb-3 ${hasDamage ? "bg-red-500" : "bg-gray-200"}`}
            >
              <Text className={`text-center font-semibold ${hasDamage ? "text-white" : "text-gray-600"}`}>
                {hasDamage ? "⚠️ Damage Reported" : "No Damage"}
              </Text>
            </TouchableOpacity>

            {/* DAMAGE FORM */}
            {hasDamage && (
              <View className="bg-red-50 p-3 rounded-xl mb-3 border border-red-100">

                {/* REPORT TYPE */}
                <Text className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                  Report Type
                </Text>
                <View className="flex-row gap-2 mb-3">
                  {(["damaged", "lost", "found"] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setReportType(type)}
                      className={`flex-1 p-2 rounded-lg border ${
                        reportType === type
                          ? "bg-red-500 border-red-500"
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

                {/* NOTE */}
                <Text className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Description *
                </Text>
                <TextInput
                  placeholder="Describe the damage/lost/found item..."
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

            {/* ACTION BUTTONS */}
            <View className="flex-row gap-2">
              {item.status === "dirty" && (
                <TouchableOpacity
                  disabled={isProcessing}
                  onPress={() => markInProgress(item.id)}
                  className="flex-1 bg-yellow-500 p-3 rounded-xl"
                >
                  <Text className="text-white text-center font-semibold">
                    Start
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                disabled={isProcessing || (hasDamage && !note.trim())}
                onPress={() => markDone(item.id, hasDamage, reportType, note, photos)}
                className={`flex-1 p-3 rounded-xl ${
                  isProcessing || (hasDamage && !note.trim())
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
                Please describe the damage before marking as done.
              </Text>
            )}
          </>
        )}

        {/* DONE — show damage summary if any */}
        {isDone && item.damage_summary && (
          <View className="mt-2 bg-orange-50 p-3 rounded-xl border border-orange-100">
            <Text className="text-xs font-semibold text-orange-600 uppercase mb-1">
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
            />
          }
        />
      )}

      {/* PHOTO PREVIEW MODAL */}
      <Modal visible={!!preview} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1 bg-black/90 justify-center items-center"
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