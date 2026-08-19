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
import { Ionicons } from "@expo/vector-icons";

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

      // ROLE BASED REDIRECT
      if (res.user.role === "guest") {
        router.replace("/(guest)/(tabs)/home");
      } else if (res.user.role === "housekeeper") {
        router.replace("/(housekeeper)/(tabs)/dashboard");
      }

    } catch (e: any) {
      console.log("LOGIN ERROR:", e.response?.data);

      const message = e.response?.data?.message;
      const userEmail = e.response?.data?.email || email;

      // handle ANY verify message
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

      // NORMAL ERROR
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
            colors={['rgba(13,46,31,0.55)', 'rgba(13,46,31,0.88)']}
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
                  <View className="bg-[#c9a96e]/15 border border-[#c9a96e]/40 p-4 rounded-full mb-4">
                    <Image
                      source={require("../../assets/logo.jpg")}
                      style={{
                        width: height * 0.1,
                        height: height * 0.1,
                      }}
                      className="rounded-full"
                    />
                  </View>
                  <Text
                    className="text-[#c9a96e] text-[11px] tracking-[4px] uppercase mb-2"
                  >
                    Welcome back
                  </Text>
                  <Text
                    className="text-white text-3xl"
                    style={{ fontFamily: "Georgia" }}
                  >
                    Lyn Enia's Travelers' Inn
                  </Text>
                  <Text
                    className="text-white/50 text-sm mt-2"
                    style={{ fontFamily: "Georgia", fontStyle: "italic" }}
                  >
                    Sign in to continue your stay
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
                  className="bg-[#faf8f3] rounded-3xl overflow-hidden"
                >
                  <View className="p-6">
                    <Text
                      className="text-2xl text-center mb-1 text-[#1a4a35]"
                      style={{ fontFamily: "Georgia" }}
                    >
                      Login
                    </Text>
                    <Text className="text-center text-[#1a4a35]/50 text-sm mb-6">
                      Enter your credentials
                    </Text>

                    {/* EMAIL FIELD */}
                    <View className="mb-4">
                      <Text className="text-[#1a4a35] text-xs tracking-widest uppercase mb-2 ml-1">
                        Email Address
                      </Text>
                      <View className="flex-row items-center bg-white rounded-xl border border-[#1a4a35]/15 px-4">
                        <Ionicons name="mail-outline" size={16} color="#1a4a35" style={{ opacity: 0.4 }} />
                        <TextInput
                          value={email}
                          onChangeText={setEmail}
                          placeholder="Enter your email"
                          placeholderTextColor="rgba(26,74,53,0.35)"
                          autoCapitalize="none"
                          keyboardType="email-address"
                          className="flex-1 py-3 px-3 text-[#1a4a35]"
                          editable={!loading}
                        />
                      </View>
                    </View>

                    {/* PASSWORD FIELD */}
                    <View className="mb-6">
                      <Text className="text-[#1a4a35] text-xs tracking-widest uppercase mb-2 ml-1">
                        Password
                      </Text>
                      <View className="flex-row items-center bg-white rounded-xl border border-[#1a4a35]/15 px-4">
                        <Ionicons name="lock-closed-outline" size={16} color="#1a4a35" style={{ opacity: 0.4 }} />
                        <TextInput
                          value={password}
                          onChangeText={setPassword}
                          placeholder="Enter your password"
                          placeholderTextColor="rgba(26,74,53,0.35)"
                          secureTextEntry={!showPassword}
                          className="flex-1 py-3 px-3 text-[#1a4a35]"
                          editable={!loading}
                        />
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          className="ml-2"
                        >
                          <Text className="text-[#c9a96e] font-semibold text-xs uppercase tracking-wide">
                            {showPassword ? "Hide" : "Show"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={() => router.push("/")}
                        className="mt-2 self-end"
                      >
                        <Text className="text-[#1a4a35]/60 text-xs">
                          Forgot Password?
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* LOGIN BUTTON */}
                    <TouchableOpacity
                      onPress={handleLogin}
                      disabled={loading}
                      activeOpacity={0.9}
                      className="rounded-2xl overflow-hidden"
                    >
                      <LinearGradient
                        colors={['#1a4a35', '#0d2e1f']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          paddingVertical: height * 0.018,
                          opacity: loading ? 0.7 : 1,
                        }}
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
                              Sign In
                            </Text>
                            <Ionicons name="arrow-forward" size={16} color="#c9a96e" />
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* DIVIDER */}
                    {/* <View className="flex-row items-center my-6">
                      <View className="flex-1 h-px bg-[#1a4a35]/10" />
                      <Text className="mx-4 text-[#1a4a35]/40 text-xs tracking-widest uppercase">or</Text>
                      <View className="flex-1 h-px bg-[#1a4a35]/10" />
                    </View> */}

                    {/* SOCIAL LOGIN OPTIONS */}
                    {/* <View className="flex-row justify-center space-x-4 gap-4"> */}
                      {/* GOOGLE BUTTON */}
                      {/* <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-white py-3 rounded-xl border border-[#1a4a35]/15">
                        <Image
                          source={require("../../assets/google-logo.png")}
                          style={{ width: 18, height: 18 }}
                        />
                        <Text className="text-[#1a4a35] font-semibold ml-2 text-sm">
                          Google
                        </Text>
                      </TouchableOpacity> */}

                      {/* FACEBOOK BUTTON */}
                      {/* <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-white py-3 rounded-xl border border-[#1a4a35]/15">
                        <Image
                          source={require("../../assets/facebook-logo.png")}
                          style={{ width: 18, height: 18 }}
                        />
                        <Text className="text-[#1a4a35] font-semibold ml-2 text-sm">
                          Facebook
                        </Text>
                      </TouchableOpacity>
                    </View> */}

                    {/* REGISTER LINK */}
                    <View className="mt-6 flex-row justify-center">
                      <Text className="text-[#1a4a35]/50 text-sm">
                        Don't have an account?{" "}
                      </Text>
                      <TouchableOpacity onPress={() => router.push("/auth/register")}>
                        <Text className="text-[#1a4a35] font-semibold text-sm">
                          Create Account
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* FOOTER */}
                <Text className="text-white/50 text-xs text-center mt-6">
                  By signing in, you agree to our Terms & Conditions
                </Text>
              </View>
            </ScrollView>
          </LinearGradient>
        </ImageBackground>

        {/* LOADING MODAL SPINNER */}
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
              className="bg-[#faf8f3] rounded-3xl items-center"
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
              <ActivityIndicator size="large" color="#1a4a35" />
              <Text
                className="text-xl mt-5 text-[#1a4a35]"
                style={{ fontFamily: "Georgia" }}
              >
                {loading ? "Signing In" : "Please Wait"}
              </Text>
              <Text className="text-sm text-[#1a4a35]/50 mt-2 text-center">
                {loading ? "Verifying your credentials" : ""}
              </Text>
              <Text className="text-xs text-[#1a4a35]/30 mt-4 text-center tracking-wide">
                Please don't close the app
              </Text>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}