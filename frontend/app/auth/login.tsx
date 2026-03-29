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
import { login } from "../../services/authService";
import { useAuthStore } from "../../store/authStore";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    const res = await login({ email, password });
    setAuth(res.user, res.token);
    router.replace("/(tabs)/home");
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
              placeholder="Email"
              placeholderTextColor="#999"
              className="border border-gray-200 p-3 rounded-xl mb-3"
              onChangeText={setEmail}
            />

            {/* PASSWORD */}
            <TextInput
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
              className="border border-gray-200 p-3 rounded-xl mb-4"
              onChangeText={setPassword}
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