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
} from "react-native";
import { useState, useRef } from "react";
import { useRouter } from "expo-router";
import { register } from "../../services/authServices";

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
        <View className="absolute inset-0 bg-green-900/60" />

        {/* CONTENT */}
        <View className="flex-1 justify-center items-center px-6">

          {/* LOGO */}
          <Image
            source={require("../../assets/logo.jpg")}
            style={{
              width: height * 0.12,
              height: height * 0.12,
            }}
            className="mb-6 rounded-full border-4 border-white"
          />

          {/* FORM CARD */}
          <View
            style={{ width: width * 0.9 }}
            className="bg-white p-6 rounded-2xl shadow-lg"
          >
            <Text className="text-2xl font-bold text-center mb-4">
              Register
            </Text>

            {/* FIRST NAME */}
            <TextInput
              placeholder="First Name *"
              placeholderTextColor="#999"
              className="border border-gray-200 p-3 rounded-xl mb-3"
              onChangeText={setFirstName}
              editable={!loading}
            />

            {/* MIDDLE NAME */}
            <TextInput
              placeholder="Middle Name (Optional)"
              placeholderTextColor="#999"
              className="border border-gray-200 p-3 rounded-xl mb-3"
              onChangeText={setMiddleName}
              editable={!loading}
            />

            {/* LAST NAME */}
            <TextInput
              placeholder="Last Name *"
              placeholderTextColor="#999"
              className="border border-gray-200 p-3 rounded-xl mb-3"
              onChangeText={setLastName}
              editable={!loading}
            />

            {/* CONTACT */}
            <TextInput
              placeholder="Contact Number (Optional)"
              placeholderTextColor="#999"
              className="border border-gray-200 p-3 rounded-xl mb-3"
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
              editable={!loading}
            />

            {/* ADDRESS */}
            <TextInput
              placeholder="Address (Optional)"
              placeholderTextColor="#999"
              className="border border-gray-200 p-3 rounded-xl mb-3"
              onChangeText={setAddress}
              editable={!loading}
            />

            {/* EMAIL */}
            <TextInput
              placeholder="Email *"
              placeholderTextColor="#999"
              className="border border-gray-200 p-3 rounded-xl mb-3"
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />

            {/* PASSWORD */}
            <TextInput
              placeholder="Password *"
              placeholderTextColor="#999"
              secureTextEntry
              className="border border-gray-200 p-3 rounded-xl mb-4"
              onChangeText={setPassword}
              editable={!loading}
            />

            <TextInput
              placeholder="Confirm Password *"
              placeholderTextColor="#999"
              secureTextEntry
              className="border border-gray-200 p-3 rounded-xl mb-4"
              onChangeText={setConfirmPassword}
              editable={!loading}
            />

            {/* BUTTON */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading || isNavigating}
              activeOpacity={0.7}
              className={`rounded-xl p-3 ${(loading || isNavigating) ? "bg-gray-400" : "bg-green-500"}`}
            >
              <Text className="text-white text-center font-bold">
                {loading ? "Registering..." : isNavigating ? "Redirecting..." : "Register"}
              </Text>
            </TouchableOpacity>

            {/* LOGIN LINK */}
            <TouchableOpacity
              onPress={() => !loading && router.push("/auth/login")}
              disabled={loading}
              className="mt-4"
            >
              <Text className="text-center text-gray-500">
                Already have an account?{" "}
                <Text className="text-green-600 font-semibold">
                  Login
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

        </View>
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
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white p-6 rounded-2xl items-center shadow-lg" style={{ width: width * 0.7 }}>
            <ActivityIndicator size="large" color="#22c55e" />
            <Text className="text-lg font-semibold mt-4 text-gray-800">
              {loading ? "Processing..." : "Please wait..."}
            </Text>
            <Text className="text-sm text-gray-500 mt-2 text-center">
              {loading ? "Creating your account..." : ""}
            </Text>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}