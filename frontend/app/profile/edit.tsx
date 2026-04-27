import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "@/services/api";

// ✅ SAFE BASE URL (NO TYPESCRIPT ERROR)
const BASE_URL = api.defaults.baseURL?.replace("/api", "") || "";

export default function EditProfile() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState<any>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [image, setImage] = useState<any>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  // ✅ FETCH USER
  const fetchUser = async () => {
    try {
      const res = await api.get("/user");
      const data = res.data;

      setUser(data);
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setPhone(data.contact_number || "");
    } catch (err) {
      console.log("EDIT PROFILE ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ PICK IMAGE
  const pickImage = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  // ✅ SAVE PROFILE
  const handleSave = async () => {
    try {
      setSaving(true);

      if (newPassword && newPassword !== confirmPassword) {
        Alert.alert("Error", "Passwords do not match");
        return;
      }

      const formData = new FormData();

      formData.append("first_name", firstName);
      formData.append("last_name", lastName);
      formData.append("phone", phone);

      if (newPassword) {
        formData.append("password", newPassword);
        formData.append("password_confirmation", confirmPassword);
      }

      if (image) {
        formData.append("profile_image", {
          uri: image.uri,
          name: "profile.jpg",
          type: "image/jpeg",
        } as any);
      }

      await api.post(`/users/${user.id}?_method=PUT`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      Alert.alert("Success", "Profile updated!");

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(guest)/(tabs)/profile");
      }

    } catch (error) {
      console.log("SAVE ERROR:", error);
      Alert.alert("Error", "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  // ✅ LOADING SCREEN
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#0fdf77" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">

      {/* HEADER */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(guest)/(tabs)/profile")
          }
          className="w-10 h-10 rounded-full bg-gray-200 justify-center items-center"
        >
          <Ionicons name="arrow-back" size={20} color="black" />
        </TouchableOpacity>

        <Text className="text-black text-lg font-bold ml-3">
          Edit Profile
        </Text>
      </View>

      <ScrollView className="flex-1 p-4">

        {/* IMAGE */}
        <View className="items-center mb-6">
          <TouchableOpacity onPress={pickImage}>
            <Image
              source={{
                uri:
                  image?.uri ||
                  (user.profile_image
                    ? `${BASE_URL}/storage/${user.profile_image}`
                    : "https://via.placeholder.com/150"),
              }}
              className="w-28 h-28 rounded-full"
            />

            <View className="absolute bottom-0 right-0 bg-black p-2 rounded-full">
              <Ionicons name="camera" size={18} color="#0fdf77" />
            </View>
          </TouchableOpacity>
        </View>

        {/* INPUTS */}
        <Input label="First Name" value={firstName} onChange={setFirstName} />
        <Input label="Last Name" value={lastName} onChange={setLastName} />
        <Input label="Phone" value={phone} onChange={setPhone} />

        <Text className="text-teal-500 font-bold mt-6 mb-2">
          Change Password
        </Text>

        <Input
          label="New Password"
          value={newPassword}
          onChange={setNewPassword}
          secure
        />

        <Input
          label="Confirm Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          secure
        />

        {/* BUTTONS */}
        <View className="flex-row gap-3 mt-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-1 border border-gray-400 p-4 rounded-xl items-center"
          >
            <Text className="text-gray-600">Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            className="flex-1 bg-teal-500 p-4 rounded-xl items-center"
          >
            <Text className="text-white font-bold">
              {saving ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ✅ INPUT COMPONENT
const Input = ({ label, value, onChange, secure = false }: any) => (
  <View className="mb-4">
    <Text className="text-gray-600 mb-1">{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      secureTextEntry={secure}
      className="bg-gray-100 text-black p-4 rounded-xl"
    />
  </View>
);