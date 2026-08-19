import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ImageBackground,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useState, useRef } from "react";
import { useRouter } from "expo-router";
import { register } from "../../services/authServices";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function Register() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const [first_name, setFirstName] = useState("");
  const [middle_name, setMiddleName] = useState("");
  const [last_name, setLastName] = useState("");
  const [contact_number, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const isProcessing = useRef(false);

  const handleRegister = async () => {
    // 🔥 Prevent double clicks and multiple submissions
    if (loading || isProcessing.current || isNavigating) {
      console.log("Prevented double click");
      return;
    }

    // Validate required fields
    if (!first_name || !last_name || !email || !password) {
      Alert.alert("Validation Error", "Please fill all required fields");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Validation Error", "Please enter a valid email address");
      return;
    }

    // Validate password length
    // 🔥 PASSWORD VALIDATION (MATCH BACKEND)
    if (password.length < 8) {
      Alert.alert("Validation Error", "Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Validation Error", "Passwords do not match");
      return;
    }

    isProcessing.current = true;
    setLoading(true);
    setShowModal(true); // Show modal immediately when registration starts

    try {
      // Call register API
      const res = await register({
        first_name,
        middle_name: middle_name || null,
        last_name,
        contact_number: contact_number || null,
        address: address || null,
        email,
        password,
        password_confirmation: confirmPassword,
      });

      console.log("REGISTER RESPONSE:", res);

      // 🔥 CHECK IF NOT VERIFIED CASE
      if (res?.message?.includes("not verified")) {
        setShowModal(false); // Hide modal before showing alert
        Alert.alert(
          "Account Not Verified",
          "This email is already registered but not verified.\n\nDo you want to continue verification?",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {
                isProcessing.current = false;
                setLoading(false);
              }
            },
            {
              text: "Continue",
              onPress: () => {
                setIsNavigating(true);
                router.replace({
                  pathname: "/auth/otp",
                  params: { email, from: "register" },
                });
              }
            }
          ]
        );
        return;
      }

      // Navigate to OTP screen IMMEDIATELY
      setIsNavigating(true);
      router.replace({
        pathname: "/auth/otp",
        params: { email: email },
      });

    } catch (e: any) {
      console.log("ERROR DATA:", e.response?.data);

      setShowModal(false); // Hide modal on error

      // Handle specific error cases
      if (e.response?.status === 400 && e.response?.data?.message === 'Email already registered') {
        Alert.alert(
          "Registration Failed",
          "This email is already registered and verified. Please login instead.",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {
                isProcessing.current = false;
                setLoading(false);
              }
            },
            {
              text: "Go to Login",
              onPress: () => {
                isProcessing.current = false;
                setLoading(false);
                router.push("/auth/login");
              }
            }
          ]
        );
      } else {
        // Generic error message
        const errorMessage = e.response?.data?.message || "Registration failed. Please try again.";
        Alert.alert("Registration Error", errorMessage);

        // Reset processing state on error
        isProcessing.current = false;
        setLoading(false);
      }
    }
    // Don't reset loading on success because we're navigating away
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {/* BACKGROUND */}
        <ImageBackground
          source={require("../../assets/bg.jpg")}
          style={{ flex: 1 }}
          resizeMode="cover"
        >
          {/* OVERLAY */}
          <LinearGradient
            colors={["rgba(13,46,31,0.55)", "rgba(13,46,31,0.88)"]}
            style={{ flex: 1 }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* CONTENT */}
              <View className="flex-1 justify-center items-center px-6 py-8">

                {/* LOGO */}
                <View className="items-center mb-6">
                  <View className="bg-[#c9a96e]/15 border border-[#c9a96e]/40 p-3 rounded-full mb-3">
                    <Image
                      source={require("../../assets/logo.jpg")}
                      style={{
                        width: height * 0.09,
                        height: height * 0.09,
                      }}
                      className="rounded-full"
                    />
                  </View>
                  <Text className="text-[#c9a96e] text-[11px] tracking-[4px] uppercase mb-2">
                    Join Us
                  </Text>
                  <Text
                    className="text-white text-2xl"
                    style={{ fontFamily: "Georgia" }}
                  >
                    Lyn Enia's Travelers' Inn
                  </Text>
                </View>

                {/* FORM CARD */}
                <View
                  style={{
                    width: width * 0.9,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.2,
                    shadowRadius: 16,
                    elevation: 8,
                  }}
                  className="bg-[#faf8f3] p-6 rounded-3xl overflow-hidden"
                >
                  <Text
                    className="text-2xl text-center mb-1 text-[#1a4a35]"
                    style={{ fontFamily: "Georgia" }}
                  >
                    Register
                  </Text>
                  <Text className="text-center text-[#1a4a35]/50 text-sm mb-6">
                    Create your guest account
                  </Text>

                  {/* FIRST NAME */}
                  <View className="flex-row items-center bg-white rounded-xl border border-[#1a4a35]/15 px-4 mb-3">
                    <Ionicons name="person-outline" size={16} color="#1a4a35" style={{ opacity: 0.4 }} />
                    <TextInput
                      placeholder="First Name *"
                      placeholderTextColor="rgba(26,74,53,0.35)"
                      className="flex-1 py-3 px-3 text-[#1a4a35]"
                      onChangeText={setFirstName}
                      editable={!loading}
                    />
                  </View>

                  {/* MIDDLE NAME */}
                  <View className="flex-row items-center bg-white rounded-xl border border-[#1a4a35]/15 px-4 mb-3">
                    <Ionicons name="person-outline" size={16} color="#1a4a35" style={{ opacity: 0.4 }} />
                    <TextInput
                      placeholder="Middle Name (Optional)"
                      placeholderTextColor="rgba(26,74,53,0.35)"
                      className="flex-1 py-3 px-3 text-[#1a4a35]"
                      onChangeText={setMiddleName}
                      editable={!loading}
                    />
                  </View>

                  {/* LAST NAME */}
                  <View className="flex-row items-center bg-white rounded-xl border border-[#1a4a35]/15 px-4 mb-3">
                    <Ionicons name="person-outline" size={16} color="#1a4a35" style={{ opacity: 0.4 }} />
                    <TextInput
                      placeholder="Last Name *"
                      placeholderTextColor="rgba(26,74,53,0.35)"
                      className="flex-1 py-3 px-3 text-[#1a4a35]"
                      onChangeText={setLastName}
                      editable={!loading}
                    />
                  </View>

                  {/* CONTACT */}
                  <View className="flex-row items-center bg-white rounded-xl border border-[#1a4a35]/15 px-4 mb-3">
                    <Ionicons name="call-outline" size={16} color="#1a4a35" style={{ opacity: 0.4 }} />
                    <TextInput
                      placeholder="Contact Number (Optional)"
                      placeholderTextColor="rgba(26,74,53,0.35)"
                      className="flex-1 py-3 px-3 text-[#1a4a35]"
                      onChangeText={setContactNumber}
                      keyboardType="phone-pad"
                      editable={!loading}
                    />
                  </View>

                  {/* ADDRESS */}
                  <View className="flex-row items-center bg-white rounded-xl border border-[#1a4a35]/15 px-4 mb-3">
                    <Ionicons name="location-outline" size={16} color="#1a4a35" style={{ opacity: 0.4 }} />
                    <TextInput
                      placeholder="Address (Optional)"
                      placeholderTextColor="rgba(26,74,53,0.35)"
                      className="flex-1 py-3 px-3 text-[#1a4a35]"
                      onChangeText={setAddress}
                      editable={!loading}
                    />
                  </View>

                  {/* EMAIL */}
                  <View className="flex-row items-center bg-white rounded-xl border border-[#1a4a35]/15 px-4 mb-3">
                    <Ionicons name="mail-outline" size={16} color="#1a4a35" style={{ opacity: 0.4 }} />
                    <TextInput
                      placeholder="Email *"
                      placeholderTextColor="rgba(26,74,53,0.35)"
                      className="flex-1 py-3 px-3 text-[#1a4a35]"
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      editable={!loading}
                    />
                  </View>

                  {/* PASSWORD */}
                  <View className="flex-row items-center bg-white rounded-xl border border-[#1a4a35]/15 px-4 mb-3">
                    <Ionicons name="lock-closed-outline" size={16} color="#1a4a35" style={{ opacity: 0.4 }} />
                    <TextInput
                      placeholder="Password *"
                      placeholderTextColor="rgba(26,74,53,0.35)"
                      secureTextEntry
                      className="flex-1 py-3 px-3 text-[#1a4a35]"
                      onChangeText={setPassword}
                      editable={!loading}
                    />
                  </View>

                  {/* CONFIRM PASSWORD */}
                  <View className="flex-row items-center bg-white rounded-xl border border-[#1a4a35]/15 px-4 mb-5">
                    <Ionicons name="lock-closed-outline" size={16} color="#1a4a35" style={{ opacity: 0.4 }} />
                    <TextInput
                      placeholder="Confirm Password *"
                      placeholderTextColor="rgba(26,74,53,0.35)"
                      secureTextEntry
                      className="flex-1 py-3 px-3 text-[#1a4a35]"
                      onChangeText={setConfirmPassword}
                      editable={!loading}
                    />
                  </View>

                  {/* BUTTON */}
                  <TouchableOpacity
                    onPress={handleRegister}
                    disabled={loading || isNavigating}
                    activeOpacity={0.9}
                    className="rounded-2xl overflow-hidden"
                  >
                    <LinearGradient
                      colors={
                        loading || isNavigating
                          ? ["#9ca3af", "#6b7280"]
                          : ["#1a4a35", "#0d2e1f"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ paddingVertical: height * 0.018 }}
                      className="flex-row items-center justify-center gap-2"
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#c9a96e" />
                      ) : (
                        <>
                          <Text
                            className="text-white text-center text-base tracking-widest uppercase"
                            style={{ fontFamily: "Georgia" }}
                          >
                            {isNavigating ? "Redirecting..." : "Register"}
                          </Text>
                          {!isNavigating && (
                            <Ionicons name="arrow-forward" size={16} color="#c9a96e" />
                          )}
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* LOGIN LINK */}
                  <TouchableOpacity
                    onPress={() => !loading && router.push("/auth/login")}
                    disabled={loading}
                    className="mt-5"
                  >
                    <Text className="text-center text-[#1a4a35]/50 text-sm">
                      Already have an account?{" "}
                      <Text className="text-[#1a4a35] font-semibold">
                        Login
                      </Text>
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* FOOTER */}
                <Text className="text-white/50 text-xs text-center mt-6">
                  By creating an account, you agree to our Terms & Conditions
                </Text>
              </View>
            </ScrollView>
          </LinearGradient>
        </ImageBackground>

        {/* 🔥 LOADING MODAL SPINNER */}
        <Modal
          transparent={true}
          visible={showModal}
          animationType="fade"
          onRequestClose={() => {
            // Don't allow closing by back button while processing
            if (!loading) {
              setShowModal(false);
            }
          }}
        >
          <View className="flex-1 justify-center items-center bg-black/60">
            <View
              className="bg-[#faf8f3] p-6 rounded-3xl items-center"
              style={{
                width: width * 0.7,
                elevation: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 5,
              }}
            >
              <ActivityIndicator size="large" color="#1a4a35" />
              <Text
                className="text-lg mt-4 text-[#1a4a35]"
                style={{ fontFamily: "Georgia" }}
              >
                {loading ? "Processing..." : "Please wait..."}
              </Text>
              <Text className="text-sm text-[#1a4a35]/50 mt-2 text-center">
                {loading ? "Creating your account..." : ""}
              </Text>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}