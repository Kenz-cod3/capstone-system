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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "@/services/api";

const { height } = Dimensions.get("window");

const BASE_URL = api.defaults.baseURL?.replace("/api", "") || "";

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: (user?: any) => void;
  user: any;
}

/* =====================================================
   INPUT COMPONENT
===================================================== */

const Input = ({
  label,
  value,
  onChange,
  secure = false,
  icon,
  editable = true,
}: any) => (
  <View className="mb-4">
    <Text
      className="text-[#1a4a35] text-sm font-medium mb-2 ml-1"
      style={{
        fontFamily: "Georgia",
      }}
    >
      {label}
    </Text>

    <View
      className={`flex-row items-center bg-[#faf8f3] rounded-2xl border border-[#1a4a35]/10 px-4 ${
        !editable ? "opacity-60" : ""
      }`}
    >
      {icon && <Ionicons name={icon} size={20} color="#c9a96e" />}

      <TextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        placeholderTextColor="#1a4a35/40"
        editable={editable}
        className="flex-1 text-[#1a4a35] p-4"
        style={{
          fontFamily: "Georgia",
        }}
      />
    </View>
  </View>
);

/* =====================================================
   EDIT PROFILE MODAL (HALF SCREEN)
===================================================== */

export default function EditProfileModal({
  visible,
  onClose,
  onUpdate,
  user,
}: EditProfileModalProps) {
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

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  /* =====================================================
     LOAD USER DATA
  ===================================================== */

  useEffect(() => {
    if (user && visible) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setPhone(user.contact_number || "");
      setEmail(user.email || "");
      setAddress(user.address || "");

      setImageUri(
        user.profile_image ? `${BASE_URL}/storage/${user.profile_image}` : null,
      );
    }
  }, [user, visible]);

  /* =====================================================
     KEYBOARD LISTENER
  ===================================================== */

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );

    const hideSubscription = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  /* =====================================================
     PICK PROFILE IMAGE
  ===================================================== */

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library",
      );

      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.5,
      allowsEditing: true,
      aspect: [1, 1],
      selectionLimit: 1,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setImage(result.assets[0]);
      setImageUri(result.assets[0].uri);
    }
  };

  /* =====================================================
     SAVE PROFILE
  ===================================================== */

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
        error.response?.data?.message || "Something went wrong",
      );
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     RENDER — HALF SCREEN BOTTOM SHEET
  ===================================================== */

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ── BACKDROP ── */}
      <View className="flex-1 bg-black/50 justify-end">
        {/* ── BLUR EFFECT ── */}
        <BlurView
          intensity={20}
          tint="dark"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        {/* ── BOTTOM SHEET — HALF SCREEN ── */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View
            className="bg-[#faf8f3] rounded-t-[30px] overflow-hidden"
            style={{
              maxHeight: height * 0.85,
              paddingBottom: keyboardVisible ? 0 : insets.bottom + 10,
            }}
          >
            {/* ── DRAG HANDLE ── */}
            <View
              style={{
                width: 44,
                height: 5,
                borderRadius: 3,
                backgroundColor: "rgba(26,74,53,0.2)",
                alignSelf: "center",
                marginTop: 12,
                marginBottom: 8,
              }}
            />

            {/* ── HEADER ── */}
            <View className="px-6 pb-4 border-b border-[#1a4a35]/10 flex-row items-center justify-between">
              <View className="flex-1">
                <Text
                  className="text-[#1a4a35] text-xl font-bold"
                  style={{
                    fontFamily: "Georgia",
                  }}
                >
                  Edit Profile
                </Text>
                <Text className="text-[#1a4a35]/40 text-xs mt-1">
                  Update your personal information
                </Text>
              </View>

              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                className="w-9 h-9 rounded-full bg-[#1a4a35]/08 justify-center items-center"
              >
                <Ionicons name="close" size={20} color="#1a4a35" />
              </TouchableOpacity>
            </View>

            {/* ── SCROLLABLE FORM ── */}
            <ScrollView
              className="px-6"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
              contentContainerStyle={{
                paddingTop: 20,
                paddingBottom: keyboardVisible ? 300 : 20,
              }}
            >
              {/* ── AVATAR ── */}
              <View className="items-center mb-6">
                <TouchableOpacity
                  onPress={pickImage}
                  activeOpacity={0.85}
                  className="relative"
                >
                  <View className="w-24 h-24 rounded-full bg-[#1a4a35]/10 justify-center items-center border-2 border-[#c9a96e] overflow-hidden">
                    {imageUri ? (
                      <Image
                        source={{ uri: imageUri }}
                        className="w-full h-full"
                      />
                    ) : (
                      <Text
                        className="text-3xl font-bold text-[#1a4a35]"
                        style={{ fontFamily: "Georgia" }}
                      >
                        {firstName?.charAt(0)?.toUpperCase() || "U"}
                      </Text>
                    )}
                  </View>

                  <View className="absolute bottom-0 right-0 bg-[#1a4a35] w-8 h-8 rounded-full justify-center items-center border-2 border-[#faf8f3]">
                    <Ionicons name="camera" size={14} color="#c9a96e" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* ── FORM FIELDS ── */}
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

              {/* ── CHANGE PASSWORD TOGGLE ── */}
              <TouchableOpacity
                onPress={() => setShowPasswordFields(!showPasswordFields)}
                activeOpacity={0.75}
                className="flex-row items-center justify-between py-3"
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-full bg-[#1a4a35]/10 justify-center items-center">
                    <Ionicons
                      name="lock-closed-outline"
                      size={16}
                      color="#c9a96e"
                    />
                  </View>

                  <Text
                    className="text-[#1a4a35] font-medium"
                    style={{ fontFamily: "Georgia" }}
                  >
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
                <View className="ml-4 pl-3 border-l-2 border-[#c9a96e] mt-1 mb-4">
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

              {/* ── ACTION BUTTONS ── */}
              <View className="flex-row gap-3 mt-6">
                <TouchableOpacity
                  onPress={onClose}
                  disabled={saving}
                  activeOpacity={0.8}
                  className="flex-1 py-4 rounded-2xl border border-[#1a4a35]/20 bg-white"
                >
                  <Text
                    className="text-[#1a4a35] text-center font-medium"
                    style={{ fontFamily: "Georgia" }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.85}
                  className="flex-1 py-4 rounded-2xl bg-[#1a4a35]"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#c9a96e" />
                  ) : (
                    <Text
                      className="text-white text-center font-bold"
                      style={{ fontFamily: "Georgia" }}
                    >
                      Save Changes
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}