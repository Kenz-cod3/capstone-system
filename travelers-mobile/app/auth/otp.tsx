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
  Alert,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import api, { setToken } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

const CREAM = "#F7F4EF";
const INK = "#1B2B27";
const GOLD = "#C89B5A";
const OTP_LENGTH = 6;

export default function OTP() {
  const { setAuth } = useAuthStore();
  const router = useRouter();
  const { email, from, expires_at } = useLocalSearchParams();
  const { height, width } = useWindowDimensions();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expiresAt, setExpiresAt] = useState(
    expires_at ? new Date(expires_at as string).getTime() : 0
  );

  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const isProcessing = useRef(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // One ref per box
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((expiresAt - Date.now()) / 1000)
      );

      setCountdown(remaining);

      if (remaining <= 0) {
        setCanResend(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Auto-focus first box on mount
  useEffect(() => {
    const t = setTimeout(() => inputRefs.current[0]?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  const handleChange = (text: string, index: number) => {
    // Strip non-numeric
    const cleaned = text.replace(/[^0-9]/g, "");

    // Handle paste of full code
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, OTP_LENGTH).split("");
      const next = [...otp];
      chars.forEach((c, i) => {
        if (index + i < OTP_LENGTH) next[index + i] = c;
      });
      setOtp(next);

      // Focus the next empty box, or last one
      const nextEmpty = next.findIndex((v) => v === "");
      if (nextEmpty === -1) {
        inputRefs.current[OTP_LENGTH - 1]?.blur();
      } else {
        inputRefs.current[nextEmpty]?.focus();
      }
      return;
    }

    // Normal single-digit input
    const next = [...otp];
    next[index] = cleaned;
    setOtp(next);

    // Auto-advance to next box
    if (cleaned && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when full
    if (cleaned && index === OTP_LENGTH - 1) {
      const full = next.join("");
      if (full.length === OTP_LENGTH) {
        // Slight delay so the last character renders
        setTimeout(() => handleVerify(next), 120);
      }
    }
  };

  const handleKeyPress = (
    e: any,
    index: number
  ) => {
    // On backspace with empty box, move focus back
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const otpCode = otp.join("");

  const handleVerify = async (overrideOtp?: string[]) => {
    if (loading || isProcessing.current) return;

    setError("");

    const code = (overrideOtp ?? otp).join("");

    if (code.length !== OTP_LENGTH) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    isProcessing.current = true;
    setLoading(true);
    Keyboard.dismiss();

    try {
      const res = await api.post("/auth/verify-otp", {
        email,
        otp: code,
      });

      console.log("OTP VERIFIED:", res.data);

      if (from === "login") {
        await setAuth(res.data.user, res.data.token);
        await setToken(res.data.token);

        if (res.data.user.role === "guest") {
          router.replace("/(guest)/(tabs)/home");
        } else if (res.data.user.role === "housekeeper") {
          router.replace("/(housekeeper)/(tabs)/dashboard");
        }
      } else {
        Alert.alert("Success", "Account verified! Please login.", [
          {
            text: "OK",
            onPress: () => router.replace("/auth/login"),
          },
        ]);
      }
    } catch (e: any) {
      console.log("OTP Verification Error:", e.response?.data);

      const errorMessage =
        e.response?.data?.message || "Invalid OTP. Please try again.";

      setError(errorMessage);
      isProcessing.current = false;
      setLoading(false);

      // Clear and refocus first box
      setOtp(Array(OTP_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/resend-otp", {
        email,
      });

      Alert.alert("Success", "A new code has been sent to your email.");

      setExpiresAt(new Date(res.data.expires_at).getTime());
      setCanResend(false);
      setOtp(Array(OTP_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    } catch (e: any) {
      const status = e.response?.status;

      if (status === 429) {
        const newExpiresAt = new Date(
          e.response.data.expires_at
        ).getTime();

        setExpiresAt(newExpiresAt);
        setCanResend(false);

        Alert.alert("OTP Active", e.response.data.message);
      } else {
        setError(e.response?.data?.message || "Failed to resend OTP.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Compute box sizing based on screen width
  // Card inner padding = 24 each side, so content width = width - 48
  // 6 boxes + 5 gaps (10px each) → box size = (contentWidth - 50) / 6
  const cardContentWidth = width - 48;
  const boxGap = 10;
  const boxSize = Math.min(
    Math.floor((cardContentWidth - boxGap * (OTP_LENGTH - 1)) / OTP_LENGTH),
    56
  );

  return (
    <View style={{ flex: 1, backgroundColor: CREAM }}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {/* ===================== HERO PANEL ===================== */}
            <View
              style={{
                height: Math.max(height * 0.34, 260),
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
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
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
                      Almost{"\n"}
                      <Text style={{ color: GOLD, fontStyle: "italic" }}>
                        there
                      </Text>
                      .
                    </Text>

                    <Text style={styles.heroScript}>
                      "One last step to begin{"\n"}
                      your stay with us."
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 12,
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
                flex: 1,
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
              <View style={{ marginBottom: 22 }}>
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
                  <Text style={styles.eyebrow}>VERIFY EMAIL</Text>
                </View>

                <Text style={styles.formTitle}>
                  Enter your{"\n"}6-digit code.
                </Text>

                <Text style={styles.formSubtitle}>
                  We sent a verification code to
                </Text>

                <View style={styles.emailPill}>
                  <Ionicons
                    name="mail-outline"
                    size={14}
                    color={GOLD}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={styles.emailText}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {email}
                  </Text>
                </View>
              </View>

              {/* Error banner */}
              {!!error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* ============ 6 OTP BOXES ============ */}
              <Text style={styles.fieldLabel}>VERIFICATION CODE</Text>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 4,
                }}
              >
                {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                  const isFocused = focusedIndex === i;
                  const isFilled = otp[i] !== "";
                  return (
                    <View
                      key={i}
                      style={[
                        styles.otpBox,
                        {
                          width: boxSize,
                          height: boxSize + 8,
                          borderColor: isFocused
                            ? GOLD
                            : isFilled
                            ? "rgba(200,155,90,0.4)"
                            : "rgba(27,43,39,0.12)",
                          borderWidth: isFocused ? 2 : 1,
                          backgroundColor: isFocused
                            ? "rgba(200,155,90,0.06)"
                            : "#FFFFFF",
                        },
                      ]}
                    >
                      <TextInput
                        ref={(el) => {
                          inputRefs.current[i] = el;
                        }}
                        value={otp[i]}
                        onChangeText={(t) => handleChange(t, i)}
                        onKeyPress={(e) => handleKeyPress(e, i)}
                        onFocus={() => setFocusedIndex(i)}
                        keyboardType="number-pad"
                        maxLength={i === 0 ? OTP_LENGTH : 1}
                        editable={!loading}
                        selectTextOnFocus
                        returnKeyType="done"
                        onSubmitEditing={() => handleVerify()}
                        caretHidden
                        style={styles.otpDigit}
                      />
                    </View>
                  );
                })}
              </View>

              {/* Countdown / resend row */}
              <View style={styles.resendRow}>
                {canResend ? (
                  <>
                    <Text style={styles.resendMuted}>
                      Didn't receive the code?
                    </Text>
                    <TouchableOpacity
                      onPress={handleResendOTP}
                      disabled={loading}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.resendLink}>Resend</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color="rgba(27,43,39,0.5)"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.resendMuted}>
                      Code expires in{" "}
                      <Text style={styles.resendTimer}>{countdown}s</Text>
                    </Text>
                  </>
                )}
              </View>

              {/* Verify button */}
              <TouchableOpacity
                onPress={() => handleVerify()}
                disabled={loading || otpCode.length !== OTP_LENGTH}
                activeOpacity={0.9}
                style={{ borderRadius: 999, overflow: "hidden", marginTop: 20 }}
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
                    opacity:
                      loading || otpCode.length !== OTP_LENGTH ? 0.55 : 1,
                  }}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator size="small" color={CREAM} />
                      <Text style={[styles.verifyText, { marginLeft: 10 }]}>
                        Verifying...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.verifyText}>Verify code</Text>
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

              {/* Back link */}
              <TouchableOpacity
                onPress={() => router.back()}
                activeOpacity={0.7}
                style={{
                  marginTop: 22,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="arrow-back"
                  size={14}
                  color="rgba(27,43,39,0.6)"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.backText}>Back to registration</Text>
              </TouchableOpacity>

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
                  <Text style={styles.securityTitle}>
                    Secure verification
                  </Text>
                  <Text style={styles.securityBody}>
                    Your code is transmitted over an encrypted connection.
                  </Text>
                </View>
              </View>
            </View>
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
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.3,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  heroScript: {
    color: "rgba(247,244,239,0.85)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
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
    fontSize: 26,
    lineHeight: 30,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
  },
  formSubtitle: {
    color: "rgba(27,43,39,0.55)",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  emailPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(200,155,90,0.12)",
    borderWidth: 1,
    borderColor: "rgba(200,155,90,0.35)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginTop: 10,
    maxWidth: "100%",
  },
  emailText: {
    color: INK,
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },

  errorBox: {
    backgroundColor: "#FEF2F2",
    borderLeftWidth: 2,
    borderLeftColor: "#F87171",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    lineHeight: 18,
  },

  fieldLabel: {
    color: "rgba(27,43,39,0.55)",
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "600",
    marginBottom: 10,
    marginLeft: 4,
  },

  otpBox: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  otpDigit: {
    width: "100%",
    height: "100%",
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: INK,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },

  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  resendMuted: {
    color: "rgba(27,43,39,0.55)",
    fontSize: 13,
  },
  resendTimer: {
    color: INK,
    fontWeight: "700",
  },
  resendLink: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
    textDecorationLine: "underline",
  },

  verifyText: {
    color: CREAM,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  backText: {
    color: "rgba(27,43,39,0.6)",
    fontSize: 13,
    fontWeight: "500",
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