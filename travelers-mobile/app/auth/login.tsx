import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  useWindowDimensions,
  StyleSheet,
  findNodeHandle,
  UIManager,
} from "react-native";
import { useRef, useState, useEffect } from "react";
import { login } from "../../services/authServices";
import { setToken, clearToken } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

const CREAM = "#F7F4EF";
const INK = "#1B2B27";
const GOLD = "#C89B5A";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const { setAuth } = useAuthStore();
  const router = useRouter();
  const { height } = useWindowDimensions();

  const passwordRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Track keyboard height so we can add a spacer only when the keyboard is up
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);

      // Auto-scroll to the currently focused input
      setTimeout(() => {
        scrollToFocused();
      }, 100);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Which input is focused?
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);

  // Scroll to the focused field so it's always visible above the keyboard
  const scrollToFocused = () => {
    const target = focusedField === "password" ? passwordRef.current : emailRef.current;
    if (!target || !scrollRef.current) return;

    const handle = findNodeHandle(target);
    if (!handle) return;

    // @ts-ignore — getInnerViewNode exists on ScrollView at runtime
    const scrollNode = scrollRef.current.getInnerViewNode
      ? scrollRef.current.getInnerViewNode()
      : findNodeHandle(scrollRef.current);

    UIManager.measureLayout(
      handle,
      scrollNode,
      () => {},
      (_x: number, y: number) => {
        // Position the input ~140px from the top so it clears the keyboard
        scrollRef.current?.scrollTo({
          y: Math.max(y - 140, 0),
          animated: true,
        });
      },
    );
  };

  // When focus changes, scroll to the new field
  useEffect(() => {
    if (!focusedField) return;
    const t = setTimeout(() => scrollToFocused(), 250);
    return () => clearTimeout(t);
  }, [focusedField, keyboardHeight]);

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      await clearToken();

      const res = await login({
        email,
        password,
      });

      console.log("LOGIN RESPONSE:", res);

      await setAuth(res.user, res.token);
      await setToken(res.token);

      if (res.user.role === "guest") {
        router.replace("/(guest)/(tabs)/home");
      } else if (res.user.role === "housekeeper") {
        router.replace("/(housekeeper)/(tabs)/dashboard");
      }
    } catch (e: any) {
      console.log("LOGIN ERROR:", e.response?.data);

      const message = e.response?.data?.message;
      const userEmail = e.response?.data?.email || email;

      if (message?.toLowerCase().includes("verify")) {
        router.replace({
          pathname: "/auth/otp",
          params: {
            email: userEmail,
            from: "login",
          },
        });
        return;
      }

      if (
        message === "Account inactive" ||
        message?.toLowerCase().includes("inactive")
      ) {
        router.replace({
          pathname: "/inactive",
          params: { email: userEmail },
        });
        return;
      }

      setError(message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: CREAM }}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{
              flexGrow: 1,
            }}
          >
            {/* ===================== HERO PANEL ===================== */}
            <View
              style={{
                height: Math.max(height * 0.5, 380),
                overflow: "hidden",
              }}
            >
              <ImageBackground
                source={require("../../assets/bg.jpg")}
                style={{ flex: 1 }}
                resizeMode="cover"
              >
                <LinearGradient
                  colors={[
                    "rgba(27,43,39,0.35)",
                    "rgba(27,43,39,0.65)",
                    "rgba(27,43,39,0.95)",
                  ]}
                  style={{
                    flex: 1,
                    justifyContent: "space-between",
                    paddingHorizontal: 24,
                    paddingTop: 60,
                    paddingBottom: 60,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 1,
                        backgroundColor: GOLD,
                        marginRight: 10,
                      }}
                    />
                    <Text style={styles.eyebrowWhite}>
                      EST. 2019 · ALUBIJID
                    </Text>
                  </View>

                  <View>
                    <Text style={styles.heroTitle}>
                      Welcome{"\n"}
                      back to{" "}
                      <Text style={{ color: GOLD, fontStyle: "italic" }}>
                        comfort
                      </Text>
                      .
                    </Text>

                    <Text style={styles.heroScript}>
                      "More than just a place to stay —{"\n"}
                      it's a home for every traveler."
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 14,
                      }}
                    >
                      <View
                        style={{
                          width: 24,
                          height: 1,
                          backgroundColor: GOLD,
                          marginRight: 8,
                        }}
                      />
                      <Text style={styles.heroLabel}>TRAVELERS INN</Text>
                    </View>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </View>

            {/* ===================== FORM PANEL ===================== */}
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                marginTop: -28,
                paddingHorizontal: 24,
                paddingTop: 32,
                paddingBottom: 40,
                ...Platform.select({
                  ios: {
                    shadowColor: INK,
                    shadowOpacity: 0.08,
                    shadowRadius: 20,
                    shadowOffset: { width: 0, height: -8 },
                  },
                  android: { elevation: 6 },
                }),
              }}
            >
              {/* Title */}
              <View style={{ marginBottom: 26 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 1,
                      backgroundColor: GOLD,
                      marginRight: 10,
                    }}
                  />
                  <Text style={styles.eyebrow}>SIGN IN</Text>
                </View>

                <Text style={styles.formTitle}>
                  Login to your{"\n"}account.
                </Text>

                <Text style={styles.formSubtitle}>
                  Enter your email below to continue.
                </Text>
              </View>

              {!!error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Email */}
              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color="rgba(27,43,39,0.4)"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  ref={emailRef}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(27,43,39,0.35)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!loading}
                  style={styles.input}
                />
              </View>

              {/* Password */}
              <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
                PASSWORD
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color="rgba(27,43,39,0.4)"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(27,43,39,0.35)"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  editable={!loading}
                  style={styles.input}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((s) => !s)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="rgba(27,43,39,0.4)"
                  />
                </TouchableOpacity>
              </View>

              {/* Remember + Forgot */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 16,
                  marginBottom: 24,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setRemember((r) => !r)}
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      borderWidth: 1.5,
                      borderColor: remember ? GOLD : "rgba(27,43,39,0.25)",
                      backgroundColor: remember ? GOLD : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                    }}
                  >
                    {remember && (
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Sign in button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.9}
                style={{ borderRadius: 999, overflow: "hidden" }}
              >
                <LinearGradient
                  colors={[INK, INK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: 52,
                    borderRadius: 999,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator size="small" color={CREAM} />
                      <Text style={[styles.signInText, { marginLeft: 10 }]}>
                        Logging in...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.signInText}>Sign in</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color={CREAM}
                        style={{ marginLeft: 8 }}
                      />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Sign up link */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  marginTop: 24,
                }}
              >
                <Text style={styles.signupText}>
                  Don't have an account?{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/auth/register")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signupLink}>Sign up</Text>
                </TouchableOpacity>
              </View>

              {/* Security badge */}
              <View style={styles.securityBadge}>
                <View style={styles.securityIconWrap}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={GOLD}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.securityTitle}>Secure access</Text>
                  <Text style={styles.securityBody}>
                    Your data is protected with enterprise-grade security.
                  </Text>
                </View>
              </View>
            </View>

            {/* ============ DYNAMIC KEYBOARD SPACER ============ */}
            {keyboardHeight > 0 && (
              <View style={{ height: keyboardHeight }} />
            )}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: GOLD,
    fontSize: 10,
    letterSpacing: 2.5,
    fontWeight: "600",
  },
  eyebrowWhite: {
    color: GOLD,
    fontSize: 10,
    letterSpacing: 2.5,
    fontWeight: "600",
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.3,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  heroScript: {
    color: "rgba(247,244,239,0.85)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
    fontStyle: "italic",
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  heroLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "600",
  },

  formTitle: {
    color: INK,
    fontSize: 28,
    lineHeight: 32,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  formSubtitle: {
    color: "rgba(27,43,39,0.55)",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  errorBox: {
    backgroundColor: "#FEF2F2",
    borderLeftWidth: 2,
    borderLeftColor: "#F87171",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 18,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    lineHeight: 18,
  },

  fieldLabel: {
    color: "rgba(27,43,39,0.55)",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(27,43,39,0.12)",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: INK,
    paddingVertical: 0,
  },

  rememberText: {
    color: "rgba(27,43,39,0.7)",
    fontSize: 13,
  },
  forgotText: {
    color: "rgba(27,43,39,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },

  signInText: {
    color: CREAM,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  signupText: {
    color: "rgba(27,43,39,0.6)",
    fontSize: 13,
  },
  signupLink: {
    color: INK,
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
    textDecorationColor: GOLD,
  },

  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27,43,39,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(27,43,39,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 24,
  },
  securityIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(200,155,90,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  securityTitle: {
    color: INK,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  securityBody: {
    color: "rgba(27,43,39,0.55)",
    fontSize: 11,
    lineHeight: 15,
  },
});