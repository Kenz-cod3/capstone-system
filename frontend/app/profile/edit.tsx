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
  Dimensions,
  Modal,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "@/services/api";

const { width, height } = Dimensions.get("window");
const BASE_URL = api.defaults.baseURL?.replace("/api", "") || "";

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: (user?: any) => void;
  user: any;
}

const Input = ({ label, value, onChange, secure = false, icon, editable = true }: any) => (
  <View className="mb-4">
    <Text className="text-[#1a4a35] text-sm font-medium mb-2 ml-1" style={{ fontFamily: "Georgia" }}>
      {label}
    </Text>
    <View className={`flex-row items-center bg-[#faf8f3] rounded-2xl border border-[#1a4a35]/10 px-4 ${!editable && "opacity-60"}`}>
      {icon && <Ionicons name={icon} size={20} color="#c9a96e" />}
      <TextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        placeholderTextColor="#1a4a35/40"
        editable={editable}
        className="flex-1 text-[#1a4a35] p-4"
        style={{ fontFamily: "Georgia" }}
      />
    </View>
  </View>
);

export default function EditProfileModal({ visible, onClose, onUpdate, user }: EditProfileModalProps) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  const [image, setImage] = useState<any>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (user && visible) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setPhone(user.contact_number || "");
      setEmail(user.email || "");
      setAddress(user.address || "");
      setImageUri(user.profile_image ? `${BASE_URL}/storage/${user.profile_image}` : null);
    }
  }, [user, visible]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow access to your photo library");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert("Error", "First name is required");
      return;
    }

    if (!lastName.trim()) {
      Alert.alert("Error", "Last name is required");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (newPassword && newPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();

      formData.append("_method", "PUT");

      formData.append("first_name", firstName);
      formData.append("last_name", lastName);
      formData.append("contact_number", phone);
      formData.append("address", address);

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

      const res = await api.post(`/users/${user.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("UPDATED:", res.data);

      Alert.alert("Success", "Profile updated successfully!");

      onUpdate(res.data.data);
      onClose();

    } catch (error: any) {
      console.log("SAVE ERROR:", error.response?.data || error);

      Alert.alert(
        "Error",
        error.response?.data?.message || "Something went wrong"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Full screen blur background */}
      <BlurView
        intensity={90}
        tint="dark"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
        }}
      />

      <View className="flex-1 justify-end">
        <View className="bg-[#faf8f3] rounded-t-3xl" style={{ maxHeight: height * 0.85 }}>
          {/* Header */}
          <View className="px-6 pt-6 pb-4 border-b border-[#1a4a35]/10">
            <View className="flex-row justify-between items-center">
              <Text className="text-[#1a4a35] text-xl font-bold" style={{ fontFamily: "Georgia" }}>
                Edit Profile
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="w-8 h-8 rounded-full bg-[#1a4a35]/10 justify-center items-center"
              >
                <Ionicons name="close" size={20} color="#1a4a35" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            className="p-6" 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          >
            {/* Avatar Section */}
            <View className="items-center mb-8">
              <TouchableOpacity onPress={pickImage} className="relative">
                <View className="w-32 h-32 rounded-full bg-[#1a4a35]/10 justify-center items-center border-2 border-[#c9a96e] overflow-hidden">
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      className="w-full h-full"
                    />
                  ) : (
                    <Text className="text-4xl font-bold text-[#1a4a35]" style={{ fontFamily: "Georgia" }}>
                      {firstName?.charAt(0)?.toUpperCase() || "U"}
                    </Text>
                  )}
                </View>
                <View className="absolute bottom-0 right-0 bg-[#1a4a35] w-10 h-10 rounded-full justify-center items-center border-2 border-white">
                  <Ionicons name="camera" size={18} color="#c9a96e" />
                </View>
              </TouchableOpacity>
              <Text className="text-[#1a4a35]/50 text-xs mt-3" style={{ fontFamily: "Georgia" }}>
                Tap to change profile photo
              </Text>
            </View>

            {/* Form Fields */}
            <Input
              label="First Name"
              value={firstName}
              onChange={setFirstName}
              icon="person-outline"
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={setLastName}
              icon="person-outline"
            />
            <Input
              label="Email Address"
              value={email}
              onChange={setEmail}
              icon="mail-outline"
              editable={false}
            />
            <Input
              label="Phone Number"
              value={phone}
              onChange={setPhone}
              icon="call-outline"
            />
            <Input
              label="Address"
              value={address}
              onChange={setAddress}
              icon="location-outline"
            />

            {/* Change Password Toggle */}
            <TouchableOpacity
              onPress={() => setShowPasswordFields(!showPasswordFields)}
              className="flex-row items-center justify-between py-4 mt-2"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-[#1a4a35]/10 justify-center items-center">
                  <Ionicons name="lock-closed-outline" size={18} color="#c9a96e" />
                </View>
                <Text className="text-[#1a4a35] font-medium" style={{ fontFamily: "Georgia" }}>
                  Change Password
                </Text>
              </View>
              <Ionicons
                name={showPasswordFields ? "chevron-up" : "chevron-down"}
                size={20}
                color="#1a4a35"
              />
            </TouchableOpacity>

            {showPasswordFields && (
              <View className="ml-4 pl-3 border-l-2 border-[#c9a96e] mt-2">
                <Input
                  label="New Password"
                  value={newPassword}
                  onChange={setNewPassword}
                  secure={true}
                  icon="key-outline"
                />
                <Input
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  secure={true}
                  icon="checkmark-circle-outline"
                />
              </View>
            )}

            {/* Action Buttons */}
            <View className="flex-row gap-3 mt-8 mb-10">
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 py-4 rounded-2xl border border-[#1a4a35]/20 bg-white"
              >
                <Text className="text-[#1a4a35] text-center font-medium" style={{ fontFamily: "Georgia" }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className="flex-1 py-4 rounded-2xl bg-[#1a4a35]"
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#c9a96e" />
                ) : (
                  <Text className="text-white text-center font-bold" style={{ fontFamily: "Georgia" }}>
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}