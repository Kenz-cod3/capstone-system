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
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { useState } from "react";
import { login } from "../../services/authServices";
import { setToken, clearToken } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { useRouter } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get("window");

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Validation Error", "Please enter email and password");
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      await clearToken();

      const res = await login({ email, password });

      console.log("LOGIN RESPONSE:", res);

      await setAuth(res.user, res.token);
      await setToken(res.token);

      // ✅ ROLE BASED REDIRECT
      if (res.user.role === "guest") {
        router.replace("/(guest)/(tabs)/home");
      } else if (res.user.role === "housekeeper") {
        router.replace("/(housekeeper)/(tabs)/dashboard");
      }

    } catch (e: any) {
      console.log("LOGIN ERROR:", e.response?.data);

      const message = e.response?.data?.message;
      const userEmail = e.response?.data?.email || email;

      // 🔥 FIX: handle ANY verify message
      if (message?.toLowerCase().includes("verify")) {

        Alert.alert(
          "Account Not Verified",
          "OTP sent to your email. Continue verification?",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "OK",
              onPress: () => {
                router.replace({
                  pathname: "/auth/otp",
                  params: { email: userEmail, from: "login" },
                });
              },
            },
          ]
        );

        return;
      }

      // ❌ NORMAL ERROR
      Alert.alert(
        "Login Failed",
        message || "Invalid email or password"
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* BACKGROUND WITH GRADIENT OVERLAY */}
        <ImageBackground
          source={require("../../assets/bg.jpg")}
          style={{ flex: 1 }}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
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
                <View className="items-center mb-8">
                  <View className="bg-white/20 p-4 rounded-full mb-3">
                    <Image
                      source={require("../../assets/logo.jpg")}
                      style={{
                        width: height * 0.1,
                        height: height * 0.1,
                      }}
                      className="rounded-full"
                    />
                  </View>
                  <Text className="text-white text-3xl font-bold tracking-wider">
                    Welcome Back
                  </Text>
                  <Text className="text-white/80 text-base mt-2">
                    Sign in to continue
                  </Text>
                </View>

                {/* FORM CARD */}
                <View
                  style={{ width: width * 0.9 }}
                  className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden"
                >
                  <View className="p-6">
                    <Text className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-green-600 to-green-500 bg-clip-text">
                      Login
                    </Text>
                    <Text className="text-center text-gray-500 mb-6">
                      Enter your credentials
                    </Text>

                    {/* EMAIL FIELD */}
                    <View className="mb-4">
                      <Text className="text-gray-700 font-semibold mb-2 ml-1">
                        Email Address
                      </Text>
                      <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200 px-4">
                        <TextInput
                          value={email}
                          onChangeText={setEmail}
                          placeholder="Enter your email"
                          placeholderTextColor="#999"
                          autoCapitalize="none"
                          keyboardType="email-address"
                          className="flex-1 py-3 text-gray-800"
                          editable={!loading}
                        />
                      </View>
                    </View>

                    {/* PASSWORD FIELD */}
                    <View className="mb-6">
                      <Text className="text-gray-700 font-semibold mb-2 ml-1">
                        Password
                      </Text>
                      <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200 px-4">
                        <TextInput
                          value={password}
                          onChangeText={setPassword}
                          placeholder="Enter your password"
                          placeholderTextColor="#999"
                          secureTextEntry={!showPassword}
                          className="flex-1 py-3 text-gray-800"
                          editable={!loading}
                        />
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          className="ml-2"
                        >
                          <Text className="text-green-600 font-semibold">
                            {showPassword ? "Hide" : "Show"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={() => router.push("/")}
                        className="mt-2 self-end"
                      >
                        <Text className="text-green-600 text-sm">
                          Forgot Password?
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* LOGIN BUTTON */}
                    <TouchableOpacity
                      onPress={handleLogin}
                      disabled={loading}
                      activeOpacity={0.9}
                    >
                      <LinearGradient
                        colors={['#10b981', '#059669']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          paddingVertical: height * 0.018,
                          borderRadius: 12,
                          opacity: loading ? 0.7 : 1,
                        }}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text className="text-white text-center font-bold text-lg">
                            Sign In
                          </Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* DIVIDER */}
                    <View className="flex-row items-center my-6">
                      <View className="flex-1 h-px bg-gray-200" />
                      <Text className="mx-4 text-gray-400 text-sm">or</Text>
                      <View className="flex-1 h-px bg-gray-200" />
                    </View>

                    {/* SOCIAL LOGIN OPTIONS */}
                    <View className="flex-row justify-center space-x-4 gap-4">
                      {/* GOOGLE BUTTON */}
                      <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-gray-50 py-3 rounded-xl border border-gray-200">
                        <Image
                          source={require("../../assets/google-logo.png")}
                          style={{ width: 20, height: 20 }}
                        />
                        <Text className="text-gray-700 font-semibold ml-2">
                          Google
                        </Text>
                      </TouchableOpacity>

                      {/* FACEBOOK BUTTON */}
                      <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-gray-50 py-3 rounded-xl border border-gray-200">
                        <Image
                          source={require("../../assets/facebook-logo.png")}
                          style={{ width: 20, height: 20 }}
                        />
                        <Text className="text-gray-700 font-semibold ml-2">
                          Facebook
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* REGISTER LINK */}
                    <View className="mt-6 flex-row justify-center">
                      <Text className="text-gray-500">
                        Don't have an account?{" "}
                      </Text>
                      <TouchableOpacity onPress={() => router.push("/auth/register")}>
                        <Text className="text-green-600 font-semibold">
                          Create Account
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* FOOTER */}
                <Text className="text-white/60 text-xs text-center mt-6">
                  By signing in, you agree to our Terms & Conditions
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
          statusBarTranslucent={true}
          onRequestClose={() => {
            if (!loading) {
              setShowModal(false);
            }
          }}
        >
          <View className="flex-1 justify-center items-center bg-black/60">
            <View
              className="bg-white rounded-3xl items-center shadow-2xl"
              style={{
                width: width * 0.75,
                padding: 30,
                elevation: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 5,
              }}
            >
              <ActivityIndicator size="large" color="#10b981" />
              <Text className="text-xl font-bold mt-5 text-gray-800">
                {loading ? "Signing In" : "Please Wait"}
              </Text>
              <Text className="text-base text-gray-500 mt-2 text-center">
                {loading ? "Verifying your credentials" : ""}
              </Text>
              <Text className="text-xs text-gray-400 mt-4 text-center">
                Please don't close the app
              </Text>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}