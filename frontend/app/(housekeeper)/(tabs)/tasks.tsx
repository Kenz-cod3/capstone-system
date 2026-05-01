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

      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];

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

  // 📸 CAMERA
  const takePhoto = async (setPhoto: any) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      alert("Camera permission is required");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.5,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  // ✅ FIXED HERE
  const markDone = async (
    id: number,
    hasDamage: boolean,
    note: string,
    photo: string | null
  ) => {
    try {
      setProcessingId(id);

      const formData = new FormData();

      // 🔥 FIX: send 1 or 0
      formData.append("has_damage", hasDamage ? "1" : "0");
      formData.append("damage_note", hasDamage ? note : "");

      if (photo) {
        formData.append("photo", {
          uri: photo,
          name: "damage.jpg",
          type: "image/jpeg",
        } as any);
      }

      await api.post(`/housekeeper/tasks/${id}/complete`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      getTasks();
    } catch (e) {
      console.log(e);
    } finally {
      setProcessingId(null);
    }
  };

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

  const TaskCard = ({ item }: any) => {
    const isDone = item.status === "available";

    const [hasDamage, setHasDamage] = useState(item.has_damage || false);
    const [note, setNote] = useState("");
    const [photo, setPhoto] = useState<string | null>(null);

    const isProcessing = processingId === item.id;

    return (
      <View className="bg-white p-5 mb-4 rounded-2xl shadow">
        <Text className="font-bold text-xl mb-2">
          Room {item.room_number}
        </Text>

        <Text className="mb-2 text-gray-500">
          {item.status}
        </Text>

        {!isDone && (
          <>
            <TouchableOpacity
              disabled={isProcessing}
              onPress={() => setHasDamage(!hasDamage)}
              className={`p-2 rounded mb-3 ${
                hasDamage ? "bg-red-500" : "bg-gray-300"
              }`}
            >
              <Text className="text-white text-center">
                {hasDamage ? "Damage Reported" : "No Damage"}
              </Text>
            </TouchableOpacity>

            {hasDamage && (
              <>
                <TextInput
                  placeholder="Describe damage..."
                  value={note}
                  onChangeText={setNote}
                  className="border p-2 mb-3 rounded"
                />

                <TouchableOpacity
                  onPress={() => takePhoto(setPhoto)}
                  className="bg-blue-500 p-2 rounded mb-3"
                >
                  <Text className="text-white text-center">
                    Take Photo
                  </Text>
                </TouchableOpacity>

                {photo && (
                  <>
                    <Image
                      source={{ uri: photo }}
                      className="w-full h-40 mb-2 rounded"
                    />

                    <TouchableOpacity
                      onPress={() => takePhoto(setPhoto)}
                      className="bg-gray-500 p-2 rounded mb-3"
                    >
                      <Text className="text-white text-center">
                        Retake
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}

            <View className="flex-row gap-2">
              {item.status === "dirty" && (
                <TouchableOpacity
                  disabled={isProcessing}
                  onPress={() => markInProgress(item.id)}
                  className="flex-1 bg-yellow-500 p-3 rounded-xl"
                >
                  <Text className="text-white text-center">
                    Start
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                disabled={isProcessing}
                onPress={() =>
                  markDone(item.id, hasDamage, note, photo)
                }
                className="flex-1 bg-green-500 p-3 rounded-xl"
              >
                <Text className="text-white text-center">
                  {isProcessing ? "Processing..." : "Done"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {isDone && item.damage_photo_url && (
          <TouchableOpacity onPress={() => setPreview(item.damage_photo_url)}>
            <Image
              source={{ uri: item.damage_photo_url }}
              className="w-full h-40 mt-2 rounded"
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View className="px-5 pt-2">
        <Text className="text-2xl font-bold mb-4">
          Cleaning Tasks
        </Text>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#10b981" />
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

      <Modal visible={!!preview} transparent>
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
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}