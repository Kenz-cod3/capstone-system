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
} from "react-native";
import { useState } from "react";
import { login } from "../../services/authServices";
import { setToken } from "../../services/api"; 
import { useAuthStore } from "../../store/authStore";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    try {
      const res = await login({ email, password });

      console.log("LOGIN RESPONSE:", res);

      // ✅ Save user + token
      await setAuth(res.user, res.token);

      // ✅ Attach token to axios
      setToken(res.token);

      // ✅ Redirect
      router.replace("/(tabs)/home");

    } catch (e: any) {
      console.log("LOGIN ERROR:", e.response?.data);

      alert(
        e.response?.data?.message || "Login failed. Please try again."
      );
    }
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
              Login
            </Text>

            {/* EMAIL */}
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#999"
              autoCapitalize="none"
              className="border border-gray-200 p-3 rounded-xl mb-3"
            />

            {/* PASSWORD */}
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
              className="border border-gray-200 p-3 rounded-xl mb-4"
            />

            {/* LOGIN BUTTON */}
            <TouchableOpacity
              onPress={handleLogin}
              style={{ paddingVertical: height * 0.015 }}
              className="bg-green-500 rounded-xl"
            >
              <Text className="text-white text-center font-bold">
                Login
              </Text>
            </TouchableOpacity>

            {/* REGISTER LINK */}
            <TouchableOpacity
              onPress={() => router.push("/auth/register")}
              className="mt-4"
            >
              <Text className="text-center text-gray-500">
                Don’t have an account?{" "}
                <Text className="text-green-600 font-semibold">
                  Register
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}